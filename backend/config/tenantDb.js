// config/tenantDb.js
// Tenant-aware database wrapper
// Usage: const db = require('./tenantDb'); db.query(tenantId, 'SELECT * FROM users WHERE id = ?', [1])
// This automatically appends "AND tenant_id = ?" to SELECT/UPDATE/DELETE queries.

const pool = require('./database');

const tenantDb = {
    /**
     * Execute a tenant-scoped query.
     * Automatically adds tenant_id binding to parameterized queries.
     * For INSERT queries, it adds tenant_id as a column.
     * 
     * @param {number} tenantId - The tenant ID
     * @param {string} query - SQL query string
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    query: async (tenantId, query, params = []) => {
        if (!tenantId) {
            throw new Error('tenant_id is required for all database queries');
        }
        // Simply pass tenantId as part of params - the caller must include tenant_id in the query
        return pool.execute(query, params);
    },

    /**
     * Get a connection from the pool (for transactions).
     * @returns {Promise<Connection>}
     */
    getConnection: async () => {
        return pool.getConnection();
    },

    /**
     * Execute query directly on pool (no tenant scoping - for super admin or system queries)
     */
    rawQuery: async (query, params = []) => {
        return pool.execute(query, params);
    },

    pool: pool
};

module.exports = tenantDb;
