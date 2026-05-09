const crypto = require('crypto');
const admin = require('../../../config/firebaseAdmin');
const prisma = require('../../../config/db');
const env = require('../../../config/env');
const { sendEmailOtp, isMailConfigured } = require('../../../services/mailer.service');
const { log } = require('../../../utils/auditLogger');

const OTP_CHANNELS = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
};
const ADMIN_OTP_PURPOSE = 'ADMIN_LOGIN';
const ALLOWED_ROLE_SCOPES = new Set(['PLATFORM', 'LAB', 'CUSTOM']);

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function normalizePhone(phone = '') {
  return String(phone).trim() || null;
}

function createOtpCode() {
  return `${crypto.randomInt(0, 1000000)}`.padStart(6, '0');
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function buildEmailAdminUid(email) {
  const digest = crypto.createHash('sha256').update(email).digest('hex').slice(0, 32);
  return `admin-email-${digest}`;
}

async function ensureFirebaseUser({ email = null, phone = null }) {
  let firebaseUser;
  try {
    if (email) {
      firebaseUser = await admin.auth().getUserByEmail(email);
    } else if (phone) {
      firebaseUser = await admin.auth().getUserByPhoneNumber(phone);
    }
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }

  if (firebaseUser) {
    return firebaseUser.uid;
  }

  // Check DB for existing profile
  const existingProfile = await prisma.profile.findFirst({
    where: email ? { email } : { phone },
    select: { id: true },
  });

  if (existingProfile) return existingProfile.id;

  // Create new Firebase user if not found
  const createParams = {};
  if (email) {
    createParams.email = email;
    createParams.emailVerified = true;
  }
  if (phone) {
    createParams.phoneNumber = phone;
    createParams.phoneVerified = true;
  }

  const userRecord = await admin.auth().createUser(createParams);
  return userRecord.uid;
}

async function upsertAdminProfile({
  uid,
  email = null,
  phone = null,
  emailVerified = false,
  phoneVerified = false,
}) {
  const normalizedEmail = email ? normalizeEmail(email) : null;
  const normalizedPhone = phone ? normalizePhone(phone) : null;

  // Check if a profile with this email already exists but with a DIFFERENT ID
  if (normalizedEmail) {
    const existingWithEmail = await prisma.profile.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingWithEmail && existingWithEmail.id !== uid) {
      console.warn(`[AdminAuth] Identity Conflict: Email ${normalizedEmail} is owned by ${existingWithEmail.id}, but Firebase says it belongs to ${uid}. Migrating...`);
      
      // For safety in this specific migration: 
      // We'll update the existing record to the new UID if possible, or just re-assign the email.
      // Since changing PKs is hard, we'll delete the old empty/conflicting profile and create the new one,
      // or just re-link the email if the current UID exists.
      await prisma.profile.update({
        where: { id: existingWithEmail.id },
        data: { email: null }, // Free up the email
      });
    }
  }

  return prisma.profile.upsert({
    where: { id: uid },
    update: {
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      emailVerified,
      phoneVerified,
    },
    create: {
      id: uid,
      email: normalizedEmail,
      phone: normalizedPhone,
      emailVerified,
      phoneVerified,
    },
  });
}

async function sendEmailLoginOtp({ email, ipAddress = null, userAgent = null }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const error = new Error('Email is required');
    error.status = 400;
    throw error;
  }

  // Check admin access
  const profile = await prisma.profile.findUnique({
    where: { email: normalizedEmail },
    include: { userRoles: { include: { role: true } } }
  });

  const hasAdminAccess = profile?.isSuperAdmin || (profile?.userRoles || []).some(ur => ur.role?.code === 'ADMIN' || ur.role?.code === 'SUPER_ADMIN');

  if (!hasAdminAccess) {
    const error = new Error('Access denied. You do not have administrative privileges.');
    error.status = 403;
    throw error;
  }

  const code = createOtpCode();
  const expiresAt = new Date(Date.now() + env.security.emailOtpExpiresMinutes * 60 * 1000);

  if (!isMailConfigured()) {
    console.log('\n[DEV] EMAIL OTP: ' + code + ' for ' + normalizedEmail + '\n');
  }

  await prisma.adminOtpChallenge.create({
    data: {
      identifier: normalizedEmail,
      channel: OTP_CHANNELS.EMAIL,
      purpose: ADMIN_OTP_PURPOSE,
      codeHash: hashOtp(code),
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  if (isMailConfigured()) {
    await sendEmailOtp({
      to: normalizedEmail,
      code,
      expiresInMinutes: env.security.emailOtpExpiresMinutes,
    });
  }

  await log({
    action: 'SEND_EMAIL_OTP',
    module: 'admin_auth',
    description: `Email OTP requested for ${normalizedEmail}`,
    ip: ipAddress,
    ua: userAgent,
  });

  return { channel: OTP_CHANNELS.EMAIL, expiresInMinutes: env.security.emailOtpExpiresMinutes };
}

async function sendPhoneLoginOtp({ phone, ipAddress = null, userAgent = null }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    const error = new Error('Phone number is required');
    error.status = 400;
    throw error;
  }

  // Check admin access
  const profile = await prisma.profile.findUnique({
    where: { phone: normalizedPhone },
    include: { userRoles: { include: { role: true } } }
  });

  const hasAdminAccess = profile?.isSuperAdmin || (profile?.userRoles || []).some(ur => ur.role?.code === 'ADMIN' || ur.role?.code === 'SUPER_ADMIN');

  if (!hasAdminAccess) {
    const error = new Error('Access denied. You do not have administrative privileges.');
    error.status = 403;
    throw error;
  }

  const code = createOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins for SMS

  console.log('\n[DEV] SMS OTP: ' + code + ' for ' + normalizedPhone + '\n');

  await prisma.adminOtpChallenge.create({
    data: {
      identifier: normalizedPhone,
      channel: OTP_CHANNELS.SMS,
      purpose: ADMIN_OTP_PURPOSE,
      codeHash: hashOtp(code),
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  // TODO: Integrate real SMS gateway
  
  await log({
    action: 'SEND_SMS_OTP',
    module: 'admin_auth',
    description: `SMS OTP requested for ${normalizedPhone}`,
    ip: ipAddress,
    ua: userAgent,
  });

  return { channel: OTP_CHANNELS.SMS, expiresInMinutes: 5 };
}

async function verifyEmailLoginOtp({ email, otp, ipAddress = null, userAgent = null }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = String(otp || '').trim();

  if (!normalizedEmail || !normalizedOtp) {
    const error = new Error('Email and OTP are required');
    error.status = 400;
    throw error;
  }

  const challenge = await prisma.adminOtpChallenge.findFirst({
    where: {
      identifier: normalizedEmail,
      purpose: ADMIN_OTP_PURPOSE,
      channel: OTP_CHANNELS.EMAIL,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    const error = new Error('No active OTP found for this email. Request a new OTP.');
    error.status = 404;
    throw error;
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    const error = new Error('OTP has expired. Request a new OTP.');
    error.status = 410;
    throw error;
  }

  if (challenge.attempts >= env.security.emailOtpMaxAttempts) {
    const error = new Error('Too many OTP attempts. Request a new OTP.');
    error.status = 429;
    throw error;
  }

  if (challenge.codeHash !== hashOtp(normalizedOtp)) {
    await prisma.adminOtpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    const error = new Error('Invalid OTP');
    error.status = 401;
    throw error;
  }

  await prisma.adminOtpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date(), attempts: { increment: 1 } },
  });

  const uid = await ensureFirebaseUser({ email: normalizedEmail });
  const profile = await upsertAdminProfile({
    uid,
    email: normalizedEmail,
    emailVerified: true,
  });

  const customToken = await admin.auth().createCustomToken(uid, {
    adminAuth: true,
    loginChannel: OTP_CHANNELS.EMAIL,
  });

  await log({
    userId: uid,
    action: 'VERIFY_EMAIL_OTP',
    module: 'admin_auth',
    entityId: challenge.id,
    description: `Email OTP verified for ${normalizedEmail}`,
    ip: ipAddress,
    ua: userAgent,
  });

  return {
    customToken,
    user: {
      id: uid,
      email: normalizedEmail,
      emailVerified: true,
      phoneVerified: profile.phoneVerified,
    },
  };
}

async function verifyPhoneLoginOtp({ phone, otp, ipAddress = null, userAgent = null }) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedOtp = String(otp || '').trim();

  if (!normalizedPhone || !normalizedOtp) {
    const error = new Error('Phone and OTP are required');
    error.status = 400;
    throw error;
  }

  const challenge = await prisma.adminOtpChallenge.findFirst({
    where: {
      identifier: normalizedPhone,
      purpose: ADMIN_OTP_PURPOSE,
      channel: OTP_CHANNELS.SMS,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    const error = new Error('No active OTP found for this phone number.');
    error.status = 404;
    throw error;
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    const error = new Error('OTP has expired.');
    error.status = 410;
    throw error;
  }

  if (challenge.attempts >= 5) { // Hardcoded limit for SMS
    const error = new Error('Too many OTP attempts.');
    error.status = 429;
    throw error;
  }

  if (challenge.codeHash !== hashOtp(normalizedOtp)) {
    await prisma.adminOtpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    const error = new Error('Invalid OTP');
    error.status = 401;
    throw error;
  }

  await prisma.adminOtpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date(), attempts: { increment: 1 } },
  });

  const uid = await ensureFirebaseUser({ phone: normalizedPhone });
  const profile = await upsertAdminProfile({
    uid,
    phone: normalizedPhone,
    phoneVerified: true,
  });

  const customToken = await admin.auth().createCustomToken(uid, {
    adminAuth: true,
    loginChannel: OTP_CHANNELS.SMS,
  });

  await log({
    userId: uid,
    action: 'VERIFY_SMS_OTP',
    module: 'admin_auth',
    entityId: challenge.id,
    description: `SMS OTP verified for ${normalizedPhone}`,
    ip: ipAddress,
    ua: userAgent,
  });

  return {
    customToken,
    user: {
      id: uid,
      phone: normalizedPhone,
      phoneVerified: true,
      emailVerified: profile.emailVerified,
    },
  };
}

async function syncAdminProfileFromToken(user = {}) {
  const uid = user.uid;
  if (!uid) {
    const error = new Error('Authenticated user is required');
    error.status = 401;
    throw error;
  }

  const email = user.email ? normalizeEmail(user.email) : null;
  const phone = user.phone || user.phone_number ? normalizePhone(user.phone || user.phone_number) : null;
  const emailVerified = Boolean(user.email_verified);
  const phoneVerified = Boolean(phone);

  await upsertAdminProfile({
    uid,
    email,
    phone,
    emailVerified,
    phoneVerified,
  });

  return prisma.profile.findUnique({
    where: { id: uid },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });
}

function validateRoleScope(scope) {
  if (!scope) return 'PLATFORM';
  const normalizedScope = String(scope).trim().toUpperCase();
  if (!ALLOWED_ROLE_SCOPES.has(normalizedScope)) {
    const error = new Error('Invalid role scope');
    error.status = 400;
    throw error;
  }
  return normalizedScope;
}

module.exports = {
  buildEmailAdminUid,
  normalizeEmail,
  normalizePhone,
  sendEmailLoginOtp,
  sendPhoneLoginOtp,
  syncAdminProfileFromToken,
  validateRoleScope,
  verifyEmailLoginOtp,
  verifyPhoneLoginOtp,
};
