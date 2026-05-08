const prisma = require('../src/config/db');
const env = require('../src/config/env');

async function main() {
    await prisma.$connect();

    const currentDatabaseRows = await prisma.$queryRawUnsafe('select current_database() as name');
    const versionRows = await prisma.$queryRawUnsafe('select version() as version');
    const timezoneRows = await prisma.$queryRawUnsafe("show timezone");

    console.log('');
    console.log('[Database Verify] Connected successfully.');
    console.log(`[Database Verify] URL looks Supabase: ${env.supabase.isDatabaseUrl}`);
    console.log(`[Database Verify] current_database(): ${currentDatabaseRows?.[0]?.name || 'unknown'}`);
    console.log(`[Database Verify] timezone: ${timezoneRows?.[0]?.TimeZone || timezoneRows?.[0]?.timezone || 'unknown'}`);
    console.log(`[Database Verify] version: ${versionRows?.[0]?.version || 'unknown'}`);
}

main()
    .catch((error) => {
        console.error('[Database Verify] Failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect().catch(() => {});
    });
