const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting RBAC Bootstrap ---');

  // 1. Create Core Modules
  const modules = [
    { name: 'Dashboard', code: 'DASHBOARD', path: '/dashboard', icon: 'FiGrid' },
    { name: 'Users', code: 'USERS', path: '/rbac/users', icon: 'FiUsers' },
    { name: 'Roles', code: 'ROLES', path: '/rbac/roles', icon: 'FiShield' },
    { name: 'Modules', code: 'MODULES', path: '/rbac/modules', icon: 'FiBox' },
    { name: 'Audit Logs', code: 'AUDIT_LOGS', path: '/rbac/audit-logs', icon: 'FiActivity' },
    { name: 'Health Records', code: 'HEALTH_RECORDS', path: '/health-records', icon: 'FiFileText' },
    { name: 'Fitness Tracking', code: 'FITNESS_TRACKING', path: '/fitness-tracking', icon: 'FiZap' },
  ];

  console.log('Creating modules and permissions...');
  for (const m of modules) {
    const code = m.code || m.name.toUpperCase().replace(/\s+/g, '_');
    
    const moduleData = {
      name: m.name,
      code,
      path: m.path,
      icon: m.icon,
      isActive: true,
      sortOrder: modules.indexOf(m),
    };

    const module = await prisma.module.upsert({
      where: { code },
      update: moduleData,
      create: moduleData,
    });

    console.log(`Upserted module: ${m.name} (${m.path})`);

    const actions = ['READ', 'WRITE', 'UPDATE', 'DELETE'];
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { code: `${code}.${action}` },
        update: {},
        create: {
          moduleId: module.id,
          code: `${code}.${action}`,
          action,
          scope: 'ALL',
          description: `${action} ${m.name}`
        }
      });
    }
  }

  // 2. Create Roles
  const roles = [
    { name: 'Super Admin', code: 'SUPER_ADMIN' },
    { name: 'Admin', code: 'ADMIN' },
    { name: 'User', code: 'USER' },
  ];

  console.log('Creating roles...');
  for (const r of roles) {
    const existing = await prisma.role.findUnique({ where: { code: r.code } });
    if (!existing) {
      await prisma.role.create({ data: { name: r.name, code: r.code, isActive: true } });
      console.log(`Created role: ${r.name}`);
    } else {
      console.log(`Role exists: ${r.name}`);
    }
  }

  // 3. Assign All Permissions to SUPER_ADMIN
  console.log('Assigning all permissions to SUPER_ADMIN...');
  const superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
  const allPermissions = await prisma.permission.findMany();

  for (const p of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: p.id, isActive: true }
    });
  }

  console.log('--- Bootstrap Complete ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
