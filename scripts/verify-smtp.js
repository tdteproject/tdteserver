const env = require('../src/config/env');
const { isMailConfigured, verifyMailerConnection, sendEmailOtp } = require('../src/services/mailer.service');

async function run() {
  console.log(`[SMTP Verify] APP_ENV=${env.appEnv} NODE_ENV=${env.nodeEnv}`);
  console.log(
    `[SMTP Verify] service=${env.smtp.service || 'custom'} host=${env.smtp.host || 'n/a'} port=${env.smtp.port} authType=${env.smtp.authType}`
  );
  console.log(`[SMTP Verify] user=${env.smtp.user || 'missing'} from=${env.smtp.fromEmail || 'missing'}`);

  if (!isMailConfigured()) {
    console.error('[SMTP Verify] Mailer is not fully configured.');
    process.exit(1);
  }

  await verifyMailerConnection();
  console.log('[SMTP Verify] SMTP connection verified successfully.');

  const testRecipient = process.env.SMTP_TEST_TO ? String(process.env.SMTP_TEST_TO).trim() : '';
  if (testRecipient) {
    await sendEmailOtp({
      to: testRecipient,
      code: '654321',
      expiresInMinutes: 10,
    });
    console.log(`[SMTP Verify] Test OTP email sent to ${testRecipient}.`);
  }
}

run().catch((error) => {
  console.error('[SMTP Verify] Failed:', error.message);
  if (error.cause?.response) {
    console.error('[SMTP Verify] Provider response:', error.cause.response);
  }
  process.exit(1);
});
