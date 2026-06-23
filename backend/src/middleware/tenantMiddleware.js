// middleware/tenantMiddleware.js
// Extracts tenant_id from JWT and attaches to request

const tenantMiddleware = {
    // Extract tenant_id from authenticated user's JWT
    extractTenantId: (req, res, next) => {
        // Skip for super admin routes
        if (req.path.startsWith('/api/super-admin')) {
            return next();
        }

        // req.user is set by authMiddleware.verifyToken
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!req.user.tenant_id) {
            return res.status(403).json({ 
                message: 'Tenant context missing. Please login again.' 
            });
        }

        // Attach tenant_id to request for easy access
        req.tenantId = req.user.tenant_id;
        next();
    },

    // Validate that tenant is active
    validateTenant: (pool) => {
        return async (req, res, next) => {
            if (!req.tenantId) return next();

            try {
                const [rows] = await pool.execute(
                    'SELECT id, is_active FROM tenants WHERE id = ?',
                    [req.tenantId]
                );

                if (rows.length === 0) {
                    return res.status(403).json({ 
                        message: 'Tenant not found' 
                    });
                }

                if (!rows[0].is_active) {
                    return res.status(403).json({ 
                        message: 'Your organization account has been deactivated. Please contact support.' 
                    });
                }

                next();
            } catch (error) {
                console.error('Tenant validation error:', error);
                res.status(500).json({ message: 'Server error' });
            }
        };
    }
};

module.exports = tenantMiddleware;
