const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearBadData() {
    try {
        const phone = '+919108124418'; // Corrected phone number from DB
        
        // Find user by phone
        const profile = await prisma.profile.findUnique({
            where: { phone: phone },
        });

        if (!profile) {
            console.log(`No profile found for phone: ${phone}`);
            process.exit(0);
        }

        const userId = profile.id;

        // Get today's date in UTC at midnight
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        console.log(`Attempting to clear data for user ${userId} on date ${today.toISOString()}`);

        const result = await prisma.fitnessActivity.deleteMany({
            where: {
                userId: userId,
                date: today
            }
        });

        console.log(`Deleted ${result.count} corrupted activity records for today.`);
    } catch (e) {
        console.error('Error clearing data:', e);
    } finally {
        await prisma.$disconnect();
    }
}

clearBadData();
