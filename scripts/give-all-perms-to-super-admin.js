const prisma = require('../src/config/db');

async function main() {
  console.log('--- Giving All Permissions to SUPER_ADMIN Role ---');

  const superAdminRole = await prisma.role.findFirst({
    where: { code: 'SUPER_ADMIN' }
  });

  if (!superAdminRole) {
    console.error('SUPER_ADMIN role not found.');
    return;
  }

  console.log(`Role: ${superAdminRole.name} (ID: ${superAdminRole.id})`);

  // Get all permissions
  const allPermissions = await prisma.permission.findMany();
  console.log(`Found ${allPermissions.length} total permissions in the database.`);

  let insertedCount = 0;
  for (const perm of allPermissions) {
    // Check if mapping exists
    const existing = await prisma.rolePermission.findFirst({
      where: {
        roleId: superAdminRole.id,
        permissionId: perm.id
      }
    });

    if (!existing) {
      await prisma.rolePermission.create({
        data: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
          isActive: true
        }
      });
      insertedCount++;
    } else if (!existing.isActive) {
      await prisma.rolePermission.update({
        where: { id: existing.id },
        data: { isActive: true }
      });
      insertedCount++;
    }
  }

  console.log(`Assigned/Activated ${insertedCount} permissions to the SUPER_ADMIN role.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
