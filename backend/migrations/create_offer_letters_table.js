const pool = require('../config/database');

async function createOfferLettersTable() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS offer_letters (
              id INT AUTO_INCREMENT PRIMARY KEY,
              employee_id INT NOT NULL,
              form_data JSON NOT NULL,
              issue_date DATE NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY employee_id (employee_id),
              FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('Offer letters table is ready');
        process.exit(0);
    } catch (error) {
        console.error('Error creating offer_letters table:', error.message);
        process.exit(1);
    }
}

createOfferLettersTable();
