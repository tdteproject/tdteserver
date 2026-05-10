require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restore() {
    // Yesterday's UTC midnight date (the one we accidentally reset)
    const yesterday = new Date('2026-05-10T00:00:00.000Z');
    
    // Restore only records that were reset to 0 (steps === 0)
    const result = await prisma.fitnessActivity.updateMany({
        where: {
            date: yesterday,
            steps: 0,
        },
        data: {
            steps: 5504,
            caloriesBurned: 0,
            distanceKm: 0,
            activeTimeMinutes: 0,
        }
    });
    console.log(`Restored ${result.count} record(s) to 5504 steps for 2026-05-10.`);
    await prisma.$disconnect();
}

restore().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
