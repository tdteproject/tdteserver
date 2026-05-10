require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const count = await prisma.gpsSession.count();
    console.log('Total GPS sessions in DB:', count);
    
    if (count > 0) {
        const sessions = await prisma.gpsSession.findMany({ take: 5, orderBy: { startTime: 'desc' } });
        console.log('Recent sessions:', JSON.stringify(sessions, null, 2));
    }
    await prisma.$disconnect();
}
check();
