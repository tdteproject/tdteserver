const prisma = require('../src/config/db');

async function main() {
  console.log('--- Current Permissions in the Database ---');
  const permissions = await prisma.permission.findMany({
    orderBy: { code: 'asc' }
  });

  permissions.forEach(p => {
    console.log(`- Code: ${p.code}, Module ID: ${p.moduleId}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
