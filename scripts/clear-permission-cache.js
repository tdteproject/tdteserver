const cacheService = require('../src/services/cache.service');

async function main() {
  console.log('--- Clearing Permission Caches ---');
  const userIds = [
    'dOOILIUhA9gdLluiHmD5XaTZ8wt2',
    'DP9ctFyj7xYfAbDUNaOvCPU8vvO2',
    'admin-email-c97049d2f8931c6ca2df3fbc5b09b87f',
    '2mol3X434sYStWOQEF8ylVEIdqr1'
  ];

  for (const uid of userIds) {
    const key = `user:permissions:${uid}`;
    await cacheService.del(key);
    console.log(`Cleared cache key: ${key}`);
  }
}

main()
  .catch(console.error)
  .finally(() => {
    process.exit(0);
  });
