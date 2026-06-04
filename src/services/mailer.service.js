const env = require('../config/env');

let transporter;
let nodemailerModule;

function hasPasswordAuth() {
  return Boolean(env.smtp.user && env.smtp.pass);
}

function hasOAuthAuth() {
  return Boolean(
    env.smtp.user
      && env.smtp.oauthClientId
      && env.smtp.oauthClientSecret
      && env.smtp.oauthRefreshToken
  );
}

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
  const hasTransport = Boolean(env.smtp.service || env.smtp.host);
  return hasTransport && (hasOAuthAuth() || hasPasswordAuth());
}

function buildAuthConfig() {
  if (env.smtp.authType === 'oauth2') {
    if (!hasOAuthAuth()) {
      throw new Error(
        'SMTP OAuth2 is selected, but SMTP_USER, SMTP_OAUTH_CLIENT_ID, SMTP_OAUTH_CLIENT_SECRET, and SMTP_OAUTH_REFRESH_TOKEN are required.'
      );
    }

    return {
      type: 'OAuth2',
      user: env.smtp.user,
      clientId: env.smtp.oauthClientId,
      clientSecret: env.smtp.oauthClientSecret,
      refreshToken: env.smtp.oauthRefreshToken,
      ...(env.smtp.oauthAccessToken ? { accessToken: env.smtp.oauthAccessToken } : {}),
    };
  }

  if (!hasPasswordAuth()) {
    throw new Error('SMTP password auth requires SMTP_USER and SMTP_PASS.');
  }

  return {
    user: env.smtp.user,
    pass: env.smtp.pass,
  };
}

function mapMailerError(error) {
  const rawMessage = error?.response || error?.message || 'Unknown SMTP error';
  const message = String(rawMessage);

  if (error?.responseCode === 535 || /BadCredentials|Username and Password not accepted/i.test(message)) {
    const mapped = new Error(
      'SMTP authentication failed. For Gmail on Render, set SMTP_USER to the Gmail address, SMTP_PASS to a Google App Password (with 2-Step Verification enabled), and keep SMTP_AUTH_TYPE=password; or switch to SMTP_AUTH_TYPE=oauth2 with the OAuth env vars.'
    );
    mapped.status = 503;
    mapped.code = 'SMTP_AUTH_FAILED';
    mapped.cause = error;
    return mapped;
  }

  const mapped = new Error(`Failed to send OTP email: ${message}`);
  mapped.status = 503;
  mapped.code = error?.code || 'SMTP_SEND_FAILED';
  mapped.cause = error;
  return mapped;
}

function getTransporter() {
  if (env.smtp.host === 'smtp.resend.com') {
    return null; // Using HTTP API instead of SMTP transport
  }

  if (!isMailConfigured()) {
    throw new Error(
      'SMTP is not configured. Set SMTP_SERVICE or SMTP_HOST, SMTP_USER, and either SMTP_PASS or SMTP OAuth2 credentials.'
    );
  }

  if (!transporter) {
    const nodemailer = getNodemailer();
    const transportConfig = {
      auth: buildAuthConfig(),
    };

    if (env.smtp.service) {
      transportConfig.service = env.smtp.service;
    } else {
      transportConfig.host = env.smtp.host;
      transportConfig.port = env.smtp.port;
      transportConfig.secure = env.smtp.secure;
    }

    console.log(`[Mailer] Creating transporter for ${env.smtp.user} (service: ${env.smtp.service || 'custom'})`);
    transporter = nodemailer.createTransport(transportConfig);
  }

  return transporter;
}

async function verifyMailerConnection() {
  if (env.smtp.host === 'smtp.resend.com') {
    // Verify connection by checking that we have an API key configured
    if (!env.smtp.pass) {
      throw new Error('Resend API key is missing. Set SMTP_PASS to your Resend API Key.');
    }
    return;
  }

  const mailer = getTransporter();

  try {
    await mailer.verify();
  } catch (error) {
    throw mapMailerError(error);
  }
}

async function sendEmailOtp({ to, code, expiresInMinutes }) {
  const from = env.smtp.fromName
    ? `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`
    : env.smtp.fromEmail;

  // Render SMTP workaround: Send via Resend HTTP API (Port 443) which is not blocked
  if (env.smtp.host === 'smtp.resend.com') {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.smtp.pass}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: 'Your PDT Admin login OTP',
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
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Resend HTTP API returned status ${response.status}: ${errBody}`);
      }
      return;
    } catch (error) {
      throw mapMailerError(error);
    }
  }

  const mailer = getTransporter();

  try {
    await mailer.sendMail({
      from,
      to,
      subject: 'Your PDT Admin login OTP',
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
  } catch (error) {
    throw mapMailerError(error);
  }
}

module.exports = {
  isMailConfigured,
  sendEmailOtp,
  verifyMailerConnection,
};

