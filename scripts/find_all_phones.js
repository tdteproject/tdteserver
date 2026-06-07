const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAllPhones() {
    try {
        const profiles = await prisma.profile.findMany();
        console.log('All profiles found:', profiles.map(p => ({id: p.id, phone: p.phone})));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

findAllPhones();
