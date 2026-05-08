// src/utils/auditLogger.js

const prisma = require('../config/db');

/**
 * Write an audit log entry. Failures are logged to console but never
 * bubble up — audit logging must never break the main operation.
 */
async function log({
  tenantId = null,
  userId = null,
  action,
  module,
  entityId = null,
  oldValues = null,
  newValues = null,
  description = null,
  ip = null,
  ua = null,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        module,
        entityId,
        oldValues: oldValues || undefined,
        newValues: newValues || undefined,
        description,
        ipAddress: ip,
        userAgent: ua,
      },
    });
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
}

module.exports = { log };
