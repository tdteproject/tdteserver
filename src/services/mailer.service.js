const env = require('../config/env');

let transporter;
let nodemailerModule;

function getNodemailer() {
  if (nodemailerModule) {
    return nodemailerModule;
  }

  try {
    // Load nodemailer lazily so optional mail support cannot crash the whole API at boot.
    // We only need this dependency when an OTP email is actually being sent.
    // eslint-disable-next-line global-require
    nodemailerModule = require('nodemailer');
    return nodemailerModule;
  } catch (error) {
    const moduleError = new Error(
      'Email OTP support is unavailable because the "nodemailer" package is not installed on the backend.'
    );
    moduleError.status = 503;
    moduleError.cause = error;
    throw moduleError;
  }
}

function isMailConfigured() {
  return Boolean(env.smtp.user && env.smtp.pass && (env.smtp.service || env.smtp.host));
}

function getTransporter() {
  if (!isMailConfigured()) {
    throw new Error('SMTP is not configured. Set SMTP_USER, SMTP_PASS, and SMTP_SERVICE or SMTP_HOST.');
  }

  if (!transporter) {
    const nodemailer = getNodemailer();
    transporter = nodemailer.createTransport({
      ...(env.smtp.service ? { service: env.smtp.service } : {}),
      ...(env.smtp.host ? { host: env.smtp.host } : {}),
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  }

  return transporter;
}

async function sendEmailOtp({ to, code, expiresInMinutes }) {
  const mailer = getTransporter();
  const from = env.smtp.fromName
    ? `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`
    : env.smtp.fromEmail;

  await mailer.sendMail({
    from,
    to,
    subject: `Your PDT Admin OTP is ${code}`,
    text: `Your PDT Admin login OTP is ${code}. It expires in ${expiresInMinutes} minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">PDT Admin Login</h2>
        <p style="margin:0 0 12px">Use the OTP below to sign in to your admin account.</p>
        <div style="display:inline-block;padding:12px 18px;border-radius:12px;background:#063C66;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:6px">
          ${code}
        </div>
        <p style="margin:16px 0 0">This OTP expires in ${expiresInMinutes} minutes.</p>
      </div>
    `,
  });
}

module.exports = {
  isMailConfigured,
  sendEmailOtp,
};
