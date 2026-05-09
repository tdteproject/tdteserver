const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting RBAC Bootstrap ---');

  // 1. Create Core Modules
  const modules = [
    { name: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { name: 'Users', path: '/users', icon: 'Users' },
    { name: 'Health Records', path: '/records', icon: 'FileText' },
    { name: 'Fitness Tracking', path: '/fitness', icon: 'Activity' },
    { name: 'IAM', path: '/iam', icon: 'ShieldCheck' },
    { name: 'Audit Logs', path: '/audit-logs', icon: 'History' },
  ];

  console.log('Creating modules and permissions...');
  for (const m of modules) {
    const code = m.name.toUpperCase().replace(/\s+/g, '_');
    const existing = await prisma.module.findUnique({ where: { code } });
    
    if (!existing) {
      const module = await prisma.module.create({
        data: {
          name: m.name,
          code,
          path: m.path,
          icon: m.icon,
          isActive: true,
          sortOrder: modules.indexOf(m),
        }
      });
      console.log(`Created module: ${m.name}`);

      const actions = ['READ', 'WRITE', 'UPDATE', 'DELETE'];
      for (const action of actions) {
        await prisma.permission.create({
          data: {
            moduleId: module.id,
            code: `${code}.${action}`,
            action,
            scope: 'ALL',
            description: `${action} ${m.name}`
          }
        });
      }
    } else {
      console.log(`Module exists: ${m.name}`);
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
