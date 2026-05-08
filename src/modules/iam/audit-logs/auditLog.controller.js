/* src/modules/iam/audit-logs/auditLog.controller.js */

const { listAuditLogs } = require("./auditLog.service");

async function list(req, res, next) {
  try {
    const data = await listAuditLogs(req.query);
    return res.json({
      success: true,
      message: "Audit logs fetched successfully",
      data,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { list };
