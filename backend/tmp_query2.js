require('dotenv').config();
const { pool } = require('./src/config/db');
Promise.all([
  pool.execute("SELECT * FROM service_settings WHERE setting_key LIKE '%smtp%' OR setting_key LIKE '%email%' OR setting_key LIKE '%mail%' LIMIT 20"),
  pool.execute("SHOW TABLES LIKE '%audit%'")
]).then(([smtp, tables]) => {
  console.log("SMTP settings:");
  console.log(JSON.stringify(smtp[0], null, 2));
  console.log("\nAudit tables:");
  console.log(JSON.stringify(tables[0], null, 2));
  process.exit(0);
}).catch(e => (console.error("Error:", e.message), process.exit(1)));
