const prisma = require('../src/config/db');
async function run() {
    const roles = await prisma.role.findMany();
    console.log(JSON.stringify(roles, null, 2));
}
run().finally(() => prisma.$disconnect());
