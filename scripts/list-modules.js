const prisma = require('../src/config/db');

async function main() {
  console.log('--- Current Modules in the Database ---');
  const modules = await prisma.module.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  modules.forEach(m => {
    console.log(`- Code: ${m.code}`);
    console.log(`  Name: ${m.name}`);
    console.log(`  Path: ${m.path}`);
    console.log(`  navigationType: ${m.navigationType}`);
    console.log(`  isClickable: ${m.isClickable}`);
    console.log(`  isVisible: ${m.isVisible}`);
    console.log(`  isActive: ${m.isActive}`);
  });
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
