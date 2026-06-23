// controllers/brandingController.js
const brandingModel = require('../models/brandingModel');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer for branding uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tenantId = req.tenantId;
        const uploadDir = path.join(__dirname, '..', 'uploads', 'branding', String(tenantId));
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const field = req.body.field || req.query.field;
        const ext = path.extname(file.originalname);
        // Name file by field: company_logo.png, hr_signature.png, company_stamp.png
        cb(null, `${field}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PNG, JPG, and SVG files are allowed'), false);
        }
    }
});

// Field name to DB column mapping
const fieldToColumn = {
    company_logo: 'logo_url',
    hr_signature: 'signature_url',
    company_stamp: 'stamp_url'
};

const brandingController = {
    // GET /api/branding — fetch branding for current tenant
    getBranding: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const branding = await brandingModel.getByTenantId(tenantId);
            
            res.json({
                success: true,
                branding: branding || {
                    company_name: '',
                    hr_name: '',
                    hr_designation: '',
                    company_address: '',
                    company_email: '',
                    company_website: '',
                    logo_url: null,
                    signature_url: null,
                    stamp_url: null
                }
            });
        } catch (error) {
            console.error('Get branding error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch branding config' });
        }
    },

    // PUT /api/branding — update text fields
    updateBranding: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const { company_name, hr_name, hr_designation, company_address, company_email, company_phone, company_website, default_terms } = req.body;

            await brandingModel.upsert(tenantId, {
                company_name: company_name || null,
                hr_name: hr_name || null,
                hr_designation: hr_designation || null,
                company_address: company_address || null,
                company_email: company_email || null,
                company_phone: company_phone || null,
                company_website: company_website || null,
                default_terms: default_terms || null
            });

            res.json({ success: true, message: 'Branding settings saved successfully' });
        } catch (error) {
            console.error('Update branding error:', error);
            res.status(500).json({ success: false, message: 'Failed to save branding settings' });
        }
    },

    // POST /api/branding/upload — upload an image asset
    uploadImage: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const field = req.body.field || req.query.field;

            if (!field || !fieldToColumn[field]) {
                return res.status(400).json({ success: false, message: 'Invalid field. Must be company_logo, hr_signature, or company_stamp' });
            }

            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            // Delete old file if exists
            const existing = await brandingModel.getByTenantId(tenantId);
            if (existing) {
                const oldUrl = existing[fieldToColumn[field]];
                if (oldUrl) {
                    const oldPath = path.join(__dirname, '..', oldUrl);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }
            }

            // Build relative URL for storage
            const imageUrl = `/uploads/branding/${tenantId}/${req.file.filename}`;
            await brandingModel.updateImageUrl(tenantId, fieldToColumn[field], imageUrl);

            res.json({
                success: true,
                message: 'Image uploaded successfully',
                url: imageUrl
            });
        } catch (error) {
            console.error('Upload image error:', error);
            res.status(500).json({ success: false, message: 'Failed to upload image' });
        }
    },

    // DELETE /api/branding/upload?field=X — remove an image
    deleteImage: async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const field = req.query.field;

            if (!field || !fieldToColumn[field]) {
                return res.status(400).json({ success: false, message: 'Invalid field' });
            }

            // Delete the file from disk
            const existing = await brandingModel.getByTenantId(tenantId);
            if (existing) {
                const oldUrl = existing[fieldToColumn[field]];
                if (oldUrl) {
                    const oldPath = path.join(__dirname, '..', oldUrl);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }
            }

            await brandingModel.clearImageUrl(tenantId, fieldToColumn[field]);

            res.json({ success: true, message: 'Image removed successfully' });
        } catch (error) {
            console.error('Delete image error:', error);
            res.status(500).json({ success: false, message: 'Failed to remove image' });
        }
    },

    // Multer middleware for single file upload
    uploadMiddleware: upload.single('image')
};

module.exports = brandingController;
