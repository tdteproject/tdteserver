require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetToday() {
    const today = new Date('2026-05-11T00:00:00.000Z');
    const result = await prisma.fitnessActivity.updateMany({
        where: {
            date: today,
            steps: { gt: 1000 } // Safety check: only reset if it looks contaminated (high steps very early)
        },
        data: {
            steps: 0,
            caloriesBurned: 0,
            distanceKm: 0,
            activeTimeMinutes: 0,
            hydrationMl: 0
        }
    });
    console.log(`Reset ${result.count} contaminated record(s) for 2026-05-11 to 0.`);
    await prisma.$disconnect();
}

resetToday();
