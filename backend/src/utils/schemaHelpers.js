const { pool } = require('../config/db');

async function tableExists(tableName) {
  const [rows] = await pool.execute(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );
  return rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(tableName, columnName, columnDefinition) {
  if (!(await columnExists(tableName, columnName))) {
    await pool.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDefinition}`);
  }
}

async function indexExists(tableName, indexName) {
  const [rows] = await pool.execute(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

async function addIndexIfMissing(tableName, indexName, indexDefinition) {
  if (!(await indexExists(tableName, indexName))) {
    await pool.execute(`ALTER TABLE \`${tableName}\` ADD ${indexDefinition}`);
  }
}

async function foreignKeyExists(tableName, constraintName) {
  const [rows] = await pool.execute(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [tableName, constraintName]
  );
  return rows.length > 0;
}

async function getForeignKeysForColumn(tableName, columnName) {
  const [rows] = await pool.execute(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [tableName, columnName]
  );
  return rows.map((row) => row.CONSTRAINT_NAME);
}

async function dropForeignKeysForColumn(tableName, columnName) {
  const keys = await getForeignKeysForColumn(tableName, columnName);
  for (const key of keys) {
    await pool.execute(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${key}\``);
  }
}

async function addForeignKeyIfMissing(tableName, constraintName, foreignKeyDefinition) {
  if (await foreignKeyExists(tableName, constraintName)) return false;

  try {
    await pool.execute(
      `ALTER TABLE \`${tableName}\` ADD CONSTRAINT \`${constraintName}\` ${foreignKeyDefinition}`
    );
    return true;
  } catch (error) {
    if ([
      'ER_CANNOT_ADD_FOREIGN',
      'ER_FK_CANNOT_OPEN_PARENT',
      'ER_FK_INCOMPATIBLE_COLUMNS',
      'ER_NO_REFERENCED_ROW_2',
      'ER_NO_SUCH_TABLE',
      'ER_ROW_IS_REFERENCED_2',
    ].includes(error.code)) {
      console.warn(`[schema] Skipped ${constraintName}: ${error.message}`);
      return false;
    }
    throw error;
  }
}

async function modifyColumnIfExists(tableName, columnName, columnDefinition) {
  if (await columnExists(tableName, columnName)) {
    await pool.execute(`ALTER TABLE \`${tableName}\` MODIFY COLUMN ${columnDefinition}`);
  }
}

module.exports = {
  tableExists,
  columnExists,
  addColumnIfMissing,
  indexExists,
  addIndexIfMissing,
  foreignKeyExists,
  getForeignKeysForColumn,
  dropForeignKeysForColumn,
  addForeignKeyIfMissing,
  modifyColumnIfExists,
};
