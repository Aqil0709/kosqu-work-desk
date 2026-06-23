require('dotenv').config();
const { pool } = require('./src/config/db');
Promise.all([
  pool.execute("SHOW TABLES LIKE '%audit%'"),
  pool.execute("SHOW TABLES LIKE '%resign%'"),
  pool.execute("DESCRIBE resignation_requests"),
]).then(([auditTables, resignTables, resignDesc]) => {
  console.log("Audit tables:");
  console.log(JSON.stringify(auditTables[0], null, 2));
  console.log("\nResignation tables:");
  console.log(JSON.stringify(resignTables[0], null, 2));
  console.log("\nResignation_requests columns:");
  console.log(JSON.stringify(resignDesc[0].map(c => ({Field: c.Field, Type: c.Type})), null, 2));
  process.exit(0);
}).catch(e => (console.error("Error:", e.message), process.exit(1)));
