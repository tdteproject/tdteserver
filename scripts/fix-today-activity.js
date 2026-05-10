/**
 * fix-today-activity.js
 * One-time script to reset today's contaminated activity records
 * that have stale steps from a previous day accumulated due to the
 * lastNativeSessionSteps = 0 bug.
 * 
 * Run: node scripts/fix-today-activity.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTodayActivity() {
    // Use today's UTC midnight date (how the DB stores dates)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // Also check the exact UTC midnight for IST users
    // IST is UTC+5:30, so IST midnight = UTC 18:30 the day before
    // The date "2026-05-11T00:00:00.000Z" is what we store for May 11 local
    console.log(`Looking for contaminated records on date: ${today.toISOString()}`);
    
    // Find all activity records for today with suspiciously high steps
    // (steps > 1000 is unlikely in the first few minutes of the day)
    const records = await prisma.fitnessActivity.findMany({
        where: {
            date: today,
            steps: { gt: 100 }, // Any record with >100 steps today is suspect
        },
        include: {
            user: {
                select: { fullName: true, phone: true }
            }
        }
    });

    if (records.length === 0) {
        console.log('✅ No contaminated records found for today.');
    } else {
        console.log(`Found ${records.length} suspect record(s) for today:`);
        records.forEach(r => {
            console.log(`  - User: ${r.user?.fullName || r.userId}, Steps: ${r.steps}, Date: ${r.date}`);
        });
        
        console.log('\nThese records may be contaminated with yesterday\'s steps.');
        console.log('The next sync from the mobile app will overwrite with correct values.');
        console.log('Or run with --reset flag to set steps to 0 now.');
        
        if (process.argv.includes('--reset')) {
            for (const record of records) {
                await prisma.fitnessActivity.update({
                    where: { id: record.id },
                    data: {
                        steps: 0,
                        caloriesBurned: 0,
                        distanceKm: 0,
                        activeTimeMinutes: 0,
                    }
                });
                console.log(`  ✅ Reset record for user ${record.user?.fullName || record.userId}`);
            }
            console.log('\n✅ All suspect records reset. Mobile app will re-sync correct values.');
        }
    }
    
    await prisma.$disconnect();
}

fixTodayActivity().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
