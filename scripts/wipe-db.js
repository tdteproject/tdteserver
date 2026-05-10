require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function wipe() {
    console.log('🚀 Starting full database wipe (preserving system configuration)...');

    try {
        // 1. Delete dependent data first (Foreign Key order)
        console.log('- Wiping GPS routes and sessions...');
        await prisma.gpsRoute.deleteMany({});
        await prisma.gpsSession.deleteMany({});

        console.log('- Wiping sleep sessions...');
        await prisma.sleepSession.deleteMany({});

        console.log('- Wiping device sources...');
        await prisma.deviceSource.deleteMany({});

        console.log('- Wiping goals...');
        await prisma.goalSetting.deleteMany({});

        console.log('- Wiping health summaries and events...');
        await prisma.healthDailySummary.deleteMany({});
        await prisma.healthEvent.deleteMany({});

        console.log('- Wiping heart rate logs...');
        await prisma.heartRateLog.deleteMany({});

        console.log('- Wiping health records...');
        await prisma.healthRecord.deleteMany({});

        console.log('- Wiping fitness activities...');
        await prisma.fitnessActivity.deleteMany({});

        console.log('- Wiping doctor-patient assignments...');
        await prisma.doctorPatient.deleteMany({});

        console.log('- Wiping audit logs and challenges...');
        await prisma.auditLog.deleteMany({});
        await prisma.adminOtpChallenge.deleteMany({});

        // 2. Wipe UserRoles but PRESERVE those belonging to Super Admins
        console.log('- Wiping user roles (except Super Admins)...');
        await prisma.userRole.deleteMany({
            where: {
                user: {
                    isSuperAdmin: false
                }
            }
        });

        // 3. Wipe Profiles but PRESERVE Super Admins
        console.log('- Wiping user profiles (except Super Admins)...');
        const deletedProfiles = await prisma.profile.deleteMany({
            where: {
                isSuperAdmin: false
            }
        });
        console.log(`✓ Deleted ${deletedProfiles.count} user profiles.`);

        console.log('\n✨ Database is now fresh. Roles, Modules, and Super Admins were preserved.');
    } catch (err) {
        console.error('❌ Error during wipe:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

wipe();
