require('dotenv').config();
const { pool } = require('./src/config/db');
pool.execute("SHOW COLUMNS FROM resignation_status_history")
  .then(([cols]) => {
    console.log("COLUMNS:", JSON.stringify(cols, null, 2));
    process.exit(0);
  })
  .catch(e => console.error("Error:", e.message) || process.exit(1));
