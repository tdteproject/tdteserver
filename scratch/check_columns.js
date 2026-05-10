const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const res = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'`;
    console.log(res);
}
main().catch(console.error).finally(() => prisma.$disconnect());
