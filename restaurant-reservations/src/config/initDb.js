const fs = require('fs');
const path = require('path');
const pool = require('./db');

const initDb = async () => {
  const initSqlPath = path.join(__dirname, 'init.sql');
  if (!fs.existsSync(initSqlPath)) return;

  const sql = fs.readFileSync(initSqlPath, 'utf8');
  await pool.query(sql);
};

module.exports = initDb;
