require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const profiles = await prisma.profile.findMany({ 
        take: 5,
        select: { id: true, phone: true, fullName: true }
    });
    console.log('Profiles:', JSON.stringify(profiles, null, 2));

    const gpsSessions = await prisma.gpsSession.findMany({ 
        take: 5, 
        orderBy: { createdAt: 'desc' },
        select: { id: true, userId: true, status: true, totalDistanceKm: true, durationSec: true, createdAt: true }
    });
    console.log('\nGPS Sessions count:', gpsSessions.length);
    if (gpsSessions.length > 0) {
        console.log(JSON.stringify(gpsSessions, null, 2));
    }
    await prisma.$disconnect();
}

check().catch(console.error);
