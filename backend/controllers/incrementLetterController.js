// controllers/incrementLetterController.js
const pool = require('../config/database');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tenantId = req.tenantId;
        const uploadDir = path.join(__dirname, '..', 'uploads', 'branding', String(tenantId), 'letters', 'increment');
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `INC-${uniqueSuffix}.pdf`);
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

const incrementLetterController = {
    generateLetter: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const generated_by = req.user.id;
            const { employee_id, date_of_issue, effective_date, previous_ctc, revised_ctc, currency, designation, department, performance_note } = req.body;

            if (!employee_id || !req.file || !previous_ctc || !revised_ctc) {
                return res.status(400).json({ success: false, message: 'Missing required fields or PDF document' });
            }

            const year = new Date().getFullYear();
            const [countRows] = await pool.execute(
                'SELECT COUNT(*) as cnt FROM increment_letters WHERE tenant_id = ? AND YEAR(created_at) = ?',
                [tenantId, year]
            );
            const seq = (countRows[0].cnt + 1).toString().padStart(4, '0');
            const ref_number = `INC-${year}-${seq}`;

            const letter_url = `/uploads/branding/${tenantId}/letters/increment/${req.file.filename}`;

            await pool.execute(
                `INSERT INTO increment_letters 
                (tenant_id, employee_id, date_of_issue, effective_date, previous_ctc, revised_ctc, currency, designation, department, performance_note, letter_url, ref_number, generated_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [tenantId, employee_id, date_of_issue, effective_date, previous_ctc, revised_ctc, currency || 'INR', designation, department, performance_note || null, letter_url, ref_number, generated_by]
            );

            res.status(201).json({ success: true, message: 'Increment letter generated and saved successfully.', letter_url });
        } catch (error) {
            console.error('Generate increment letter error:', error);
            res.status(500).json({ success: false, message: 'Failed to generate increment letter' });
        }
    },

    getAllLetters: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const [letters] = await pool.execute(
                `SELECT i.*, u.first_name, u.last_name 
                 FROM increment_letters i
                 JOIN employee_details ed ON i.employee_id = ed.id
                 JOIN users u ON ed.user_id = u.id
                 WHERE i.tenant_id = ? 
                 ORDER BY i.created_at DESC`,
                [tenantId]
            );
            res.json({ success: true, data: letters });
        } catch (error) {
            console.error('Get all increment letters error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch letters' });
        }
    },

    getMyLetters: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const userId = req.user.id;
            const [letters] = await pool.execute(
                `SELECT i.* FROM increment_letters i
                 JOIN employee_details ed ON i.employee_id = ed.id
                 WHERE i.tenant_id = ? AND ed.user_id = ? 
                 ORDER BY i.created_at DESC`,
                [tenantId, userId]
            );
            res.json({ success: true, data: letters });
        } catch (error) {
            console.error('Get my increment letters error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch your letters' });
        }
    },

    getLetterById: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { id } = req.params;
            const [letters] = await pool.execute(
                `SELECT i.*, u.first_name, u.last_name 
                 FROM increment_letters i
                 JOIN employee_details ed ON i.employee_id = ed.id
                 JOIN users u ON ed.user_id = u.id
                 WHERE i.id = ? AND i.tenant_id = ?`,
                [id, tenantId]
            );

            if (letters.length === 0) return res.status(404).json({ success: false, message: 'Letter not found' });
            res.json({ success: true, data: letters[0] });
        } catch (error) {
            console.error('Get increment letter error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch letter' });
        }
    },

    deleteLetter: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { id } = req.params;
            
            const [result] = await pool.execute(
                'DELETE FROM increment_letters WHERE id = ? AND tenant_id = ?',
                [id, tenantId]
            );

            if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Letter not found' });
            res.json({ success: true, message: 'Letter revoked successfully.' });
        } catch (error) {
            console.error('Delete increment letter error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete letter' });
        }
    },

    uploadPDFMiddleware: upload.single('pdf')
};

module.exports = incrementLetterController;
