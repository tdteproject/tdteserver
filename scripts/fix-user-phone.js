require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const legacyId = '2mol3X434sYStWOQEF8ylVEIdqr1'; // Test account with records
    const realId = 'DP9ctFyj7xYfAbDUNaOvCPU8vvO2';   // Anil's real email account
    const phone = '+919999999999';

    console.log(`[Fix] Claiming data for phone ${phone} to real account ${realId}...`);

    try {
        // 1. Check if legacy account exists and has the phone
        const legacyProfile = await prisma.profile.findUnique({ where: { id: legacyId } });
        
        if (legacyProfile && legacyProfile.phone === phone) {
            console.log('[Fix] Clearing phone from legacy profile...');
            await prisma.profile.update({
                where: { id: legacyId },
                data: { phone: null }
            });
        }

        // 2. Update real profile phone
        await prisma.profile.update({
            where: { id: realId },
            data: { phone: phone, phoneVerified: true }
        });
        console.log('[Fix] Updated real profile phone to', phone);

        // 3. Move health records
        const recordUpdate = await prisma.healthRecord.updateMany({
            where: { userId: legacyId },
            data: { userId: realId }
        });
        console.log(`[Fix] Moved ${recordUpdate.count} health records.`);

        // 4. Move fitness activities
        const fitnessUpdate = await prisma.fitnessActivity.updateMany({
            where: { userId: legacyId },
            data: { userId: realId }
        });
        console.log(`[Fix] Moved ${fitnessUpdate.count} fitness activities.`);

        // 5. Move heart rate logs
        const hrUpdate = await prisma.heartRateLog.updateMany({
            where: { userId: legacyId },
            data: { userId: realId }
        });
        console.log(`[Fix] Moved ${hrUpdate.count} heart rate logs.`);

        // 6. Move GPS sessions
        const gpsUpdate = await prisma.gpsSession.updateMany({
            where: { userId: legacyId },
            data: { userId: realId }
        });
        console.log(`[Fix] Moved ${gpsUpdate.count} GPS sessions.`);

        // 7. Delete legacy profile if it exists
        if (legacyId !== realId) {
            try {
                await prisma.profile.delete({ where: { id: legacyId } });
                console.log('[Fix] Deleted legacy placeholder profile.');
            } catch (e) {
                console.log('[Fix] Legacy profile already gone or could not delete.');
            }
        }

        console.log('[Fix] ✓ All data migrated successfully.');
    } catch (err) {
        console.error('[Fix] Error during recovery:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

fix();
