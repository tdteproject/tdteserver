const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const appEnv = process.env.APP_ENV || 'local';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${appEnv}`), override: true });

const checks = [
    {
        label: 'DATABASE_URL',
        ok: Boolean(process.env.DATABASE_URL),
        hint: 'Point this at your Supabase pooled/session Postgres URL.',
    },
    {
        label: 'DIRECT_URL or DIRECT_DATABASE_URL',
        ok: Boolean(process.env.DIRECT_URL || process.env.DIRECT_DATABASE_URL),
        hint: 'Point this at your Supabase session/direct Postgres URL for Prisma migrations.',
    },
    {
        label: 'SUPABASE_URL',
        ok: Boolean(process.env.SUPABASE_URL),
        hint: 'Use https://<project-ref>.supabase.co',
    },
    {
        label: 'SUPABASE_SERVICE_ROLE_KEY',
        ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        hint: 'Required for server-side storage upload/sign/delete operations.',
    },
    {
        label: 'STORAGE_PROVIDER',
        ok: String(process.env.STORAGE_PROVIDER || '').toLowerCase() === 'supabase',
        hint: 'Set STORAGE_PROVIDER=supabase after file migration.',
    },
    {
        label: 'Firebase Admin credentials',
        ok: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
        hint: 'Current auth flow still expects Firebase Admin on the backend.',
    },
];

const databaseUrl = process.env.DATABASE_URL || '';
const directDatabaseUrl = process.env.DIRECT_URL || process.env.DIRECT_DATABASE_URL || '';

console.log('');
console.log(`[Supabase Preflight] APP_ENV=${appEnv}`);
console.log(`[Supabase Preflight] DATABASE_URL host looks Supabase: ${/supabase\.(co|in)/i.test(databaseUrl)}`);
console.log(`[Supabase Preflight] DIRECT_URL host looks Supabase: ${/supabase\.(co|in)/i.test(directDatabaseUrl)}`);
console.log('');

let hasFailure = false;
for (const check of checks) {
    if (check.ok) {
        console.log(`PASS  ${check.label}`);
        continue;
    }

    hasFailure = true;
    console.log(`FAIL  ${check.label}`);
    console.log(`      ${check.hint}`);
}

console.log('');
if (hasFailure) {
    console.log('[Supabase Preflight] Resolve the failed items before running migrations or storage cutover.');
    process.exitCode = 1;
} else {
    console.log('[Supabase Preflight] Supabase configuration looks ready for backend cutover.');
}
