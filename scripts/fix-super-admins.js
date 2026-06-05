const prisma = require('../src/config/db');

async function main() {
  console.log('--- Syncing isSuperAdmin for user profiles ---');
  
  // Find the role ID for SUPER_ADMIN
  const superAdminRole = await prisma.role.findFirst({
    where: { code: 'SUPER_ADMIN' }
  });

  if (!superAdminRole) {
    console.error('SUPER_ADMIN role not found in the database.');
    return;
  }

  console.log(`SUPER_ADMIN role found with ID: ${superAdminRole.id}`);

  // Find all user role assignments with this role ID
  const superAdminAssignments = await prisma.userRole.findMany({
    where: { roleId: superAdminRole.id, isActive: true },
    select: { userId: true }
  });

  const userIds = superAdminAssignments.map(a => a.userId);
  console.log(`Found ${userIds.length} users with active SUPER_ADMIN role assigned.`);

  if (userIds.length > 0) {
    const updateResult = await prisma.profile.updateMany({
      where: {
        id: { in: userIds },
        isSuperAdmin: false
      },
      data: { isSuperAdmin: true }
    });
    console.log(`Updated ${updateResult.count} profiles to set isSuperAdmin = true.`);
  }

  // Also verify profiles currently set as isSuperAdmin = true but DO NOT have the role
  const superAdminProfiles = await prisma.profile.findMany({
    where: { isSuperAdmin: true },
    select: { id: true, phone: true, email: true }
  });

  console.log('Current Super Admins in the DB:');
  superAdminProfiles.forEach(p => {
    console.log(`- ID: ${p.id}, Phone: ${p.phone || 'N/A'}, Email: ${p.email || 'N/A'}`);
  });
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
