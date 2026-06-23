// controllers/experienceLetterController.js
const pool = require('../config/database');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tenantId = req.tenantId;
        const uploadDir = path.join(__dirname, '..', 'uploads', 'branding', String(tenantId), 'letters', 'experience');
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `EXP-${uniqueSuffix}.pdf`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

const experienceLetterController = {
    generateLetter: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const generated_by = req.user.id;
            const { employee_id, date_of_issue, date_of_joining, last_working_day, designation, department, employment_type, custom_note } = req.body;

            if (!employee_id || !req.file) {
                return res.status(400).json({ success: false, message: 'Employee ID and PDF document are required' });
            }

            const year = new Date().getFullYear();
            const [countRows] = await pool.execute(
                'SELECT COUNT(*) as cnt FROM experience_letters WHERE tenant_id = ? AND YEAR(created_at) = ?',
                [tenantId, year]
            );
            const seq = (countRows[0].cnt + 1).toString().padStart(4, '0');
            const ref_number = `EXP-${year}-${seq}`;

            const letter_url = `/uploads/branding/${tenantId}/letters/experience/${req.file.filename}`;

            await pool.execute(
                `INSERT INTO experience_letters 
                (tenant_id, employee_id, date_of_issue, date_of_joining, last_working_day, designation, department, employment_type, custom_note, letter_url, ref_number, generated_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [tenantId, employee_id, date_of_issue, date_of_joining, last_working_day, designation, department, employment_type, custom_note || null, letter_url, ref_number, generated_by]
            );

            res.status(201).json({ success: true, message: 'Experience letter generated and saved successfully.', letter_url });
        } catch (error) {
            console.error('Generate experience letter error:', error);
            res.status(500).json({ success: false, message: 'Failed to generate experience letter' });
        }
    },

    getAllLetters: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const [letters] = await pool.execute(
                `SELECT e.*, u.first_name, u.last_name 
                 FROM experience_letters e
                 JOIN employee_details ed ON e.employee_id = ed.id
                 JOIN users u ON ed.user_id = u.id
                 WHERE e.tenant_id = ? 
                 ORDER BY e.created_at DESC`,
                [tenantId]
            );
            res.json({ success: true, data: letters });
        } catch (error) {
            console.error('Get all experience letters error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch letters' });
        }
    },

    getMyLetters: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const userId = req.user.id;
            const [letters] = await pool.execute(
                `SELECT e.* FROM experience_letters e
                 JOIN employee_details ed ON e.employee_id = ed.id
                 WHERE e.tenant_id = ? AND ed.user_id = ? 
                 ORDER BY e.created_at DESC`,
                [tenantId, userId]
            );
            res.json({ success: true, data: letters });
        } catch (error) {
            console.error('Get my experience letters error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch your letters' });
        }
    },

    getLetterById: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { id } = req.params;
            const [letters] = await pool.execute(
                `SELECT e.*, u.first_name, u.last_name 
                 FROM experience_letters e
                 JOIN employee_details ed ON e.employee_id = ed.id
                 JOIN users u ON ed.user_id = u.id
                 WHERE e.id = ? AND e.tenant_id = ?`,
                [id, tenantId]
            );

            if (letters.length === 0) return res.status(404).json({ success: false, message: 'Letter not found' });
            res.json({ success: true, data: letters[0] });
        } catch (error) {
            console.error('Get experience letter error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch letter' });
        }
    },

    deleteLetter: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { id } = req.params;
            
            const [result] = await pool.execute(
                'DELETE FROM experience_letters WHERE id = ? AND tenant_id = ?',
                [id, tenantId]
            );

            if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Letter not found' });
            res.json({ success: true, message: 'Letter revoked successfully.' });
        } catch (error) {
            console.error('Delete experience letter error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete letter' });
        }
    },

    uploadPDFMiddleware: upload.single('pdf')
};

module.exports = experienceLetterController;
