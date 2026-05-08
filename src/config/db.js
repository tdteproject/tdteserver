const { PrismaClient } = require('@prisma/client');
const env = require('./env');

const normalizeDatabaseUrl = (rawUrl) => {
    if (!rawUrl) return rawUrl;

    try {
        const url = new URL(rawUrl);
        const host = url.hostname.toLowerCase();
        const isSupabasePooler = host.includes('pooler.supabase.com');

        // Prisma + Supabase pooler is most stable with a single active client
        // connection and explicit TLS.
        if (isSupabasePooler) {
            if (!url.searchParams.has('pgbouncer')) {
                url.searchParams.set('pgbouncer', 'true');
            }
            if (!url.searchParams.has('connection_limit')) {
                url.searchParams.set('connection_limit', '1');
            }
            if (!url.searchParams.has('sslmode')) {
                url.searchParams.set('sslmode', 'require');
            }
        }

        return url.toString();
    } catch {
        return rawUrl;
    }
};

let prisma;

const createClient = (options = {}) => new PrismaClient({
    datasources: {
        db: {
            url: normalizeDatabaseUrl(env.databaseUrl),
        },
    },
    ...options,
});

if (process.env.NODE_ENV === 'production') {
    prisma = createClient();
} else {
    if (!global.__prisma) {
        global.__prisma = createClient({
            log: ['query', 'info', 'warn', 'error'],
        });
    }
    prisma = global.__prisma;
}

module.exports = prisma;
