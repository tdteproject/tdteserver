require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const records = await prisma.healthRecord.findMany({ 
        take: 10, 
        orderBy: { createdAt: 'desc' } 
    });
    console.log('Total records in DB:', records.length);
    console.log('Records:', JSON.stringify(records, null, 2));

    // Also check profiles
    const profiles = await prisma.profile.findMany({ 
        take: 5,
        select: { id: true, phone: true, name: true }
    });
    console.log('\nProfiles:', JSON.stringify(profiles, null, 2));

    // Also check GPS sessions
    const gpsSessions = await prisma.gpsSession.findMany({ 
        take: 10, 
        orderBy: { createdAt: 'desc' } 
    });
    console.log('\nGPS Sessions count:', gpsSessions.length);

    await prisma.$disconnect();
}

check().catch(console.error);
