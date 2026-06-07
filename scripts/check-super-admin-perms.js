const prisma = require('../src/config/db');

async function main() {
  console.log('--- Checking SUPER_ADMIN Role Permissions ---');
  
  const superAdminRole = await prisma.role.findFirst({
    where: { code: 'SUPER_ADMIN' }
  });

  if (!superAdminRole) {
    console.error('SUPER_ADMIN role not found.');
    return;
  }

  console.log(`Role: ${superAdminRole.name} (Code: ${superAdminRole.code})`);

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: superAdminRole.id, isActive: true },
    include: {
      permission: true
    }
  });

  console.log(`Found ${rolePermissions.length} permissions assigned to the SUPER_ADMIN role:`);
  rolePermissions.forEach(rp => {
    console.log(`- ${rp.permission.code} (active: ${rp.isActive})`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
