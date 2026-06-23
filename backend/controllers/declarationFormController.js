const pool = require('../config/database');

const declarationFormController = {
    // Save or update Declaration Form
   saveDeclarationForm: async (req, res) => {
    try {
        let { employee_id, form_data, issue_date } = req.body;
        const company_id = req.tenantId; // Secure by tenant ID
        
        // Convert employee_id to number if it's a string
        employee_id = Number(employee_id);
        
        if (isNaN(employee_id)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid employee_id. Must be a number.' 
            });
        }

            // Check if table exists, if not create it
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS declaration_form (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    employee_id INT NOT NULL,
                    company_id VARCHAR(100) NOT NULL,
                    form_data JSON NOT NULL,
                    issue_date DATE NOT NULL,
                    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
                    submitted_at DATETIME NULL,
                    approved_at DATETIME NULL,
                    approved_by INT NULL,
                    rejection_reason TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_employee_id (employee_id),
                    INDEX idx_company_id (company_id),
                    UNIQUE KEY unique_employee_form (employee_id, company_id)
                )
            `;
            
            await pool.execute(createTableQuery);
            
            const query = `
                INSERT INTO declaration_form (employee_id, company_id, form_data, issue_date) 
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                form_data = VALUES(form_data), 
                issue_date = VALUES(issue_date),
                updated_at = CURRENT_TIMESTAMP
            `;

            await pool.execute(query, [employee_id, company_id, JSON.stringify(form_data), issue_date]);
            console.log('✅ Declaration Form saved successfully');

            res.status(200).json({ 
                success: true,
                message: 'Declaration Form saved/updated successfully'
            });
        } catch (error) {
            console.error('❌ Save Declaration Form error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error: ' + error.message 
            });
        }
    },

    // Get all Declaration Forms for a company
    getAllDeclarationForms: async (req, res) => {
        try {
            const { company_id } = req.params;
            
            // SECURITY HOTFIX: ensure company_id matches the authenticated tenant
            if (String(company_id) !== String(req.tenantId)) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access to this company data'
                });
            }
            
            // Check if table exists
            const [tables] = await pool.execute(
                "SHOW TABLES LIKE 'declaration_form'"
            );
            
            if (tables.length === 0) {
                return res.json({ success: true, data: [] });
            }
            
            const query = `
                SELECT 
                    df.id, 
                    df.employee_id, 
                    df.form_data, 
                    df.issue_date, 
                    df.status,
                    df.submitted_at,
                    df.approved_at,
                    df.created_at, 
                    df.updated_at
                FROM declaration_form df
                WHERE df.company_id = ?
                ORDER BY df.updated_at DESC
            `;

            const [rows] = await pool.execute(query, [company_id]);

            const processedRows = rows.map(row => ({
                ...row,
                form_data: typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data
            }));

            res.json({ success: true, data: processedRows });
        } catch (error) {
            console.error('Get all Declaration Forms error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error: ' + error.message 
            });
        }
    },

    // Get single Declaration Form by ID
    getDeclarationFormById: async (req, res) => {
        try {
            const { id } = req.params;
            const company_id = req.tenantId; // Secure by tenant ID
            
            const [rows] = await pool.execute(
                'SELECT * FROM declaration_form WHERE id = ? AND company_id = ?',
                [id, company_id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Declaration Form not found' 
                });
            }

            const form = {
                ...rows[0],
                form_data: typeof rows[0].form_data === 'string' ? JSON.parse(rows[0].form_data) : rows[0].form_data
            };

            res.json({ success: true, data: form });
        } catch (error) {
            console.error('Get Declaration Form by ID error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error: ' + error.message 
            });
        }
    },

    // Delete Declaration Form
    deleteDeclarationForm: async (req, res) => {
        try {
            const { id } = req.params;
            const company_id = req.tenantId; // Secure by tenant ID
            
            const [result] = await pool.execute('DELETE FROM declaration_form WHERE id = ? AND company_id = ?', [id, company_id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Declaration Form not found' 
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Declaration Form deleted successfully' 
            });
        } catch (error) {
            console.error('Delete Declaration Form error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error: ' + error.message 
            });
        }
    }
};

module.exports = declarationFormController;