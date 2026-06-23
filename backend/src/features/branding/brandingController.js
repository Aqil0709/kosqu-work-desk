// controllers/brandingController.js
const brandingModel = require('./brandingModel');
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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PNG, JPG, WEBP, and SVG files are allowed'), false);
        }
    }
});

// Field name to DB column mapping
const fieldToColumn = {
    company_logo:    'logo_url',
    hr_signature:    'signature_url',
    company_stamp:   'stamp_url',
    idcard_header:   'idcard_header_url',
    idcard_footer:   'idcard_footer_url',
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
                    company_name: '', hr_name: '', hr_designation: '',
                    company_address: '', company_email: '', company_phone: '',
                    company_website: '', company_tagline: '', company_cin: '',
                    company_gst: '', doc_header_fields: null, default_terms: null,
                    logo_url: null, signature_url: null, stamp_url: null,
                    idcard_header_url: null, idcard_footer_url: null,
                    watermark_enabled: 1, watermark_opacity: 0.07,
                    watermark_size: 'medium', watermark_position: 'center',
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
            const {
                company_name, hr_officer_name, hr_name, hr_designation,
                company_address, company_email, company_phone, company_website,
                company_tagline, company_cin, company_gst, doc_header_fields,
                default_terms,
                watermark_enabled, watermark_opacity, watermark_size, watermark_position,
            } = req.body;
            const normalizedTerms = Array.isArray(default_terms)
                ? JSON.stringify(default_terms.filter((term) => String(term).trim()))
                : default_terms || null;
            const normalizedHeaderFields = doc_header_fields
                ? (typeof doc_header_fields === 'string' ? doc_header_fields : JSON.stringify(doc_header_fields))
                : null;

            await brandingModel.upsert(tenantId, {
                company_name,
                hr_name: hr_officer_name || hr_name,
                hr_designation,
                company_address,
                company_email,
                company_phone,
                company_website,
                company_tagline,
                company_cin,
                company_gst,
                doc_header_fields: normalizedHeaderFields,
                default_terms: normalizedTerms,
                watermark_enabled: watermark_enabled !== undefined ? Boolean(watermark_enabled) : undefined,
                watermark_opacity: watermark_opacity !== undefined ? Number(watermark_opacity) : undefined,
                watermark_size:    watermark_size    !== undefined ? watermark_size    : undefined,
                watermark_position: watermark_position !== undefined ? watermark_position : undefined,
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
                return res.status(400).json({ success: false, message: `Invalid field "${field}". Must be one of: ${Object.keys(fieldToColumn).join(', ')}` });
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

    // Multer middleware for single file upload — wraps multer errors into 400 responses
    uploadMiddleware: (req, res, next) => {
        upload.single('image')(req, res, (err) => {
            if (err) {
                return res.status(400).json({ success: false, message: err.message || 'File upload error' });
            }
            next();
        });
    }
};

module.exports = brandingController;
