const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const appEnv = process.env.APP_ENV || 'local';
if (appEnv) {
    dotenv.config({ path: path.resolve(process.cwd(), `.env.${appEnv}`), override: true });
}

function validateEnv() {
    const firebaseMissing = !process.env.FIREBASE_SERVICE_ACCOUNT_PATH && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const dbMissing = !process.env.DATABASE_URL;

    const errors = [];
    if (dbMissing) errors.push('DATABASE_URL');
    if (firebaseMissing) errors.push('FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON');

    if (errors.length > 0) {
        console.error('[Config] Missing required environment variables:', errors.join(', '));
        console.error('[Config] Copy .env.example to .env and fill in the values.');
        if (process.env.NODE_ENV === 'production' || appEnv === 'cloud') {
            process.exit(1);
        }
    }
}

validateEnv();

const parseAllowedOrigins = () => {
    const raw = process.env.CORS_ALLOWED_ORIGINS;
    if (!raw || !raw.trim()) {
        // Default to allowing all origins if not explicitly configured
        return ['*'];
    }

    return raw
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const readEnv = (key, fallback = '') => {
    const value = process.env[key];
    if (value === undefined || value === null) return fallback;
    return String(value).trim();
};

const parseBoolean = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value).toLowerCase() === 'true';
};

const parseNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultHost = process.env.NODE_ENV === 'production'
    ? '0.0.0.0'
    : (String(process.env.DEV_BIND_LOCALHOST || '').toLowerCase() === 'true' ? '127.0.0.1' : '0.0.0.0');

const port = parseInt(process.env.PORT, 10) || 3000;
const host = process.env.HOST || defaultHost;
const isProduction = process.env.NODE_ENV === 'production';
const storageProvider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const databaseUrl = process.env.DATABASE_URL || '';
const directDatabaseUrl = process.env.DIRECT_URL || process.env.DIRECT_DATABASE_URL || null;
const smtpPort = parseNumber(process.env.SMTP_PORT, 587);

module.exports = {
    appEnv,
    port,
    host,
    nodeEnv: process.env.NODE_ENV || 'development',
    isDev: process.env.NODE_ENV !== 'production',
    databaseUrl,
    directDatabaseUrl,
    uploadsDir: process.env.UPLOADS_DIR || './uploads',
    storage: {
        provider: storageProvider,
        signedUrlExpiresSeconds: parseNumber(process.env.STORAGE_SIGNED_URL_EXPIRES_SECONDS, 3600),
        supabaseUrl,
        supabaseServiceRoleKey,
        recordsBucket: process.env.SUPABASE_STORAGE_RECORDS_BUCKET || 'health-records',
        profileBucket: process.env.SUPABASE_STORAGE_PROFILE_BUCKET || 'profile-pictures',
    },
    supabase: {
        url: supabaseUrl,
        serviceRoleKey: supabaseServiceRoleKey,
        isStorageEnabled: storageProvider === 'supabase',
        isDatabaseUrl: /supabase\.(co|in)/i.test(databaseUrl),
        isDirectDatabaseUrl: /supabase\.(co|in)/i.test(directDatabaseUrl || ''),
    },
    corsAllowedOrigins: parseAllowedOrigins(),
    firebase: {
        serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    },
    smtp: {
        service: readEnv('SMTP_SERVICE'),
        host: readEnv('SMTP_HOST'),
        port: smtpPort,
        secure: parseBoolean(process.env.SMTP_SECURE, smtpPort === 465),
        user: readEnv('SMTP_USER'),
        pass: readEnv('SMTP_PASS'),
        fromEmail: readEnv('OTP_FROM_EMAIL') || readEnv('SMTP_USER'),
        fromName: readEnv('OTP_FROM_NAME', 'PDT Admin'),
        authType: readEnv('SMTP_AUTH_TYPE', 'password').toLowerCase(),
        oauthClientId: readEnv('SMTP_OAUTH_CLIENT_ID'),
        oauthClientSecret: readEnv('SMTP_OAUTH_CLIENT_SECRET'),
        oauthRefreshToken: readEnv('SMTP_OAUTH_REFRESH_TOKEN'),
        oauthAccessToken: readEnv('SMTP_OAUTH_ACCESS_TOKEN'),
    },
    security: {
        trustProxy: parseBoolean(process.env.TRUST_PROXY, isProduction),
        enforceHttps: parseBoolean(process.env.ENFORCE_HTTPS, isProduction),
        allowPublicConfig: parseBoolean(process.env.ALLOW_PUBLIC_CONFIG, !isProduction),
        requireEmailVerified: parseBoolean(process.env.AUTH_REQUIRE_EMAIL_VERIFIED, true),
        authMaxSessionAgeSeconds: parseNumber(process.env.AUTH_MAX_SESSION_AGE_SECONDS, 24 * 60 * 60),
        authLimiterWindowMs: parseNumber(process.env.AUTH_LIMIT_WINDOW_MS, 15 * 60 * 1000),
        authLimiterMax: parseNumber(process.env.AUTH_LIMIT_MAX, 20),
        apiLimiterWindowMs: parseNumber(process.env.API_LIMIT_WINDOW_MS, 60 * 1000),
        apiLimiterMax: parseNumber(process.env.API_LIMIT_MAX, 120),
        writeLimiterWindowMs: parseNumber(process.env.WRITE_LIMIT_WINDOW_MS, 60 * 1000),
        writeLimiterMax: parseNumber(process.env.WRITE_LIMIT_MAX, 30),
        emailOtpExpiresMinutes: parseNumber(process.env.EMAIL_OTP_EXPIRES_MINUTES, 10),
        emailOtpMaxAttempts: parseNumber(process.env.EMAIL_OTP_MAX_ATTEMPTS, 5),
        emailOtpAllowConsoleFallback: parseBoolean(process.env.EMAIL_OTP_ALLOW_CONSOLE_FALLBACK, process.env.NODE_ENV !== 'production'),
    },
    activeBaseUrl: `http://${host}:${port}`,
};
