const prisma = require('../src/config/db');

async function promoteToSuperAdmin(email) {
    console.log(`--- Promoting ${email} to SUPER_ADMIN ---`);
    
    // 1. Find the user
    const profile = await prisma.profile.findUnique({
        where: { email }
    });

    if (!profile) {
        console.log('Profile NOT FOUND. Make sure you have logged in at least once.');
        return;
    }

    // 2. Ensure SUPER_ADMIN role exists
    let superAdminRole = await prisma.role.findFirst({
        where: { code: 'SUPER_ADMIN' }
    });

    if (!superAdminRole) {
        console.log('SUPER_ADMIN role not found. Creating it...');
        superAdminRole = await prisma.role.create({
            data: {
                name: 'SUPER_ADMIN',
                code: 'SUPER_ADMIN',
                description: 'Full system access',
                scope: 'PLATFORM'
            }
        });
    }

    // 3. Assign role to user
    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: profile.id,
                roleId: superAdminRole.id
            }
        },
        update: { isActive: true },
        create: {
            userId: profile.id,
            roleId: superAdminRole.id,
            isActive: true
        }
    });

    // 4. Set isSuperAdmin flag
    await prisma.profile.update({
        where: { id: profile.id },
        data: { isSuperAdmin: true }
    });

    console.log(`SUCCESS! ${email} is now a SUPER_ADMIN.`);
    console.log('Please LOG OUT and LOG IN again to refresh your session permissions.');
}

const email = process.argv[2] || 'anilkumardesai18@gmail.com';
promoteToSuperAdmin(email).finally(() => prisma.$disconnect());
