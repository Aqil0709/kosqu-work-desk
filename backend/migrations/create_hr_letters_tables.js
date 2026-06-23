const pool = require('../config/database');

async function createTables() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS resignation_requests (
              id INT AUTO_INCREMENT PRIMARY KEY,
              tenant_id INT NOT NULL,
              employee_id INT NOT NULL,
              requested_last_day DATE NOT NULL,
              reason TEXT NOT NULL,
              additional_note TEXT,
              status VARCHAR(20) NOT NULL DEFAULT 'pending',
              hr_note TEXT,
              rejection_reason TEXT,
              accepted_last_day DATE,
              letter_url TEXT,
              letter_generated_at TIMESTAMP NULL,
              ref_number VARCHAR(100),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ resignation_requests table created');

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS experience_letters (
              id INT AUTO_INCREMENT PRIMARY KEY,
              tenant_id INT NOT NULL,
              employee_id INT NOT NULL,
              date_of_issue DATE NOT NULL,
              date_of_joining DATE NOT NULL,
              last_working_day DATE NOT NULL,
              designation VARCHAR(255) NOT NULL,
              department VARCHAR(255) NOT NULL,
              employment_type VARCHAR(50) NOT NULL,
              custom_note TEXT,
              letter_url TEXT NOT NULL,
              ref_number VARCHAR(100),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ experience_letters table created');

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS increment_letters (
              id INT AUTO_INCREMENT PRIMARY KEY,
              tenant_id INT NOT NULL,
              employee_id INT NOT NULL,
              date_of_issue DATE NOT NULL,
              effective_date DATE NOT NULL,
              previous_ctc DECIMAL(15, 2) NOT NULL,
              revised_ctc DECIMAL(15, 2) NOT NULL,
              increment_percentage DECIMAL(8, 2) GENERATED ALWAYS AS (ROUND(((revised_ctc - previous_ctc) / previous_ctc) * 100, 2)) STORED,
              currency VARCHAR(10) NOT NULL DEFAULT 'INR',
              designation VARCHAR(255) NOT NULL,
              department VARCHAR(255) NOT NULL,
              performance_note TEXT,
              letter_url TEXT,
              ref_number VARCHAR(100),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ increment_letters table created');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        process.exit(1);
    }
}

createTables();
