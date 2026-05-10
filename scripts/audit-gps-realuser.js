require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    // The real user's profile seems to be DP9ctFyj7xYfAbDUNaOvCPU8vvO2 (Anil Kumar Desai, no phone)
    // This is the core bug - the real user has phone=null in the profile!
    // Records are stored under the test account (+919999999999) but the real user has no phone set.
    
    console.log('=== GPS Sessions ===');
    const gpsSessions = await prisma.gpsSession.findMany({ 
        take: 5, 
        orderBy: { startTime: 'desc' },
        select: { 
            id: true, 
            userId: true, 
            activityType: true, 
            distanceMeters: true, 
            caloriesBurned: true, 
            startTime: true, 
            endTime: true 
        }
    });
    console.log('GPS Sessions count:', gpsSessions.length);
    console.log(JSON.stringify(gpsSessions, null, 2));

    console.log('\n=== Profile Phone Check for real user ===');
    const realUser = await prisma.profile.findUnique({ 
        where: { id: 'DP9ctFyj7xYfAbDUNaOvCPU8vvO2' }
    });
    console.log('Real user profile:', JSON.stringify(realUser, null, 2));
    
    await prisma.$disconnect();
}

check().catch(console.error);
