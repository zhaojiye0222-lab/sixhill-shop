const db = require('../database');

/**
 * 记录操作日志到 operation_logs 表
 */
const logOperation = async (action, entityType, entityId, details, user) => {
  try {
    await db.query(
      `INSERT INTO operation_logs (action, entity_type, entity_id, details, operator_id, operator_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [action, entityType, entityId, details, user.id, user.name]
    );
  } catch (err) {
    console.error('Failed to log operation:', err);
  }
};

module.exports = { logOperation };
