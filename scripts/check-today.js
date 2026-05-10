require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const today = new Date('2026-05-11T00:00:00.000Z');
    const records = await prisma.fitnessActivity.findMany({
        where: {
            date: today
        }
    });
    console.log('Records for 2026-05-11:', JSON.stringify(records, null, 2));
    await prisma.$disconnect();
}

check();
