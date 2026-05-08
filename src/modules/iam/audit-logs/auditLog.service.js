/* src/modules/iam/audit-logs/auditLog.service.js */

const prisma = require('../../../config/db');

/**
 * List audit logs with pagination and filters.
 */
async function listAuditLogs(query) {
  let { search, page = 1, limit = 20, startDate, endDate, action, module: moduleName } = query;

  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  const where = {};

  if (search) {
    const searchValue = search.toLowerCase();
    where.OR = [
      { action: { contains: searchValue, mode: 'insensitive' } },
      { module: { contains: searchValue, mode: 'insensitive' } },
      { description: { contains: searchValue, mode: 'insensitive' } },
    ];
  }

  if (action) where.action = action;
  if (moduleName) where.module = moduleName;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [rows, count] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}

module.exports = { listAuditLogs };
