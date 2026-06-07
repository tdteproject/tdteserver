const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findPhone() {
    try {
        const profiles = await prisma.profile.findMany({
            where: {
                phone: {
                    contains: '9108124118'
                }
            }
        });

        console.log('Profiles found:', profiles.map(p => p.phone));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

findPhone();
