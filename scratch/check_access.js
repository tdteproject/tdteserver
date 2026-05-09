const prisma = require('../src/config/db');

async function checkUser(email) {
    console.log(`--- Checking Access for ${email} ---`);
    const profile = await prisma.profile.findUnique({
        where: { email },
        include: {
            userRoles: {
                include: {
                    role: {
                        include: {
                            rolePermissions: {
                                include: {
                                    permission: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!profile) {
        console.log('Profile NOT FOUND in database.');
        return;
    }

    console.log('User ID:', profile.id);
    console.log('Is Super Admin Flag:', profile.isSuperAdmin);
    console.log('Roles Assigned:', profile.userRoles.length);

    profile.userRoles.forEach(ur => {
        console.log(` - Role: ${ur.role.name} (${ur.role.id})`);
        console.log(`   Permissions Count: ${ur.role.rolePermissions.length}`);
    });

    if (profile.userRoles.length === 0) {
        console.log('\n[WARNING] User has NO ROLES assigned. They will be denied access to everything.');
    }
}

const email = process.argv[2] || 'anilkumardesai18@gmail.com';
checkUser(email).finally(() => prisma.$disconnect());
