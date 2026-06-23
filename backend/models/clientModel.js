// backend/models/clientModel.js
const pool = require('../config/database');

const Client = {
    // Get all clients with counts
    getAll: async (tenantId, filters = {}) => {
        let query = `
            SELECT 
                c.*,
                COUNT(DISTINCT ci.id) as interactions_count,
                COUNT(DISTINCT cp.id) as projects_count,
                COUNT(DISTINCT cd.id) as documents_count
            FROM clients c
            LEFT JOIN client_interactions ci ON c.id = ci.client_id
            LEFT JOIN client_projects cp ON c.id = cp.client_id
            LEFT JOIN client_documents cd ON c.id = cd.client_id
            WHERE c.tenant_id = ?
        `;

        const whereConditions = [];
        const params = [tenantId];

        if (filters.search) {
            whereConditions.push(`
                (c.name LIKE ? OR c.contact_person LIKE ? OR c.industry LIKE ? 
                OR c.location LIKE ? OR c.assigned_manager LIKE ?)
            `);
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (filters.industry) {
            whereConditions.push('c.industry = ?');
            params.push(filters.industry);
        }

        if (filters.status) {
            whereConditions.push('c.status = ?');
            params.push(filters.status);
        }

        if (filters.assigned_manager) {
            whereConditions.push('c.assigned_manager = ?');
            params.push(filters.assigned_manager);
        }

        if (filters.location) {
            whereConditions.push('c.location LIKE ?');
            params.push(`%${filters.location}%`);
        }

        if (whereConditions.length > 0) {
            query += ' AND ' + whereConditions.join(' AND ');
        }

        query += ' GROUP BY c.id ORDER BY c.name';

        const [rows] = await pool.execute(query, params);
        return rows;
    },

    // Get client by ID
    getById: async (tenantId, id) => {
        const [rows] = await pool.execute(
            `SELECT * FROM clients WHERE id = ? AND tenant_id = ?`,
            [id, tenantId]
        );
        return rows[0];
    },

    // Create new client
    create: async (tenantId, clientData) => {
        const {
            name, industry, contact_person, contact_email, contact_phone,
            location, assigned_manager, status, founded_year, employees_count,
            revenue, website, notes, preferred_contact, follow_up_frequency, next_follow_up
        } = clientData;

        const [result] = await pool.execute(
            `INSERT INTO clients (
                tenant_id, name, industry, contact_person, contact_email, contact_phone,
                location, assigned_manager, status, founded_year, employees_count,
                revenue, website, notes, preferred_contact, follow_up_frequency, next_follow_up
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId, name, industry, contact_person, contact_email, contact_phone,
                location, assigned_manager, status, founded_year, employees_count,
                revenue, website, notes, preferred_contact, follow_up_frequency, next_follow_up
            ]
        );
        return result.insertId;
    },

    // Update client
    update: async (tenantId, id, clientData) => {
        const {
            name, industry, contact_person, contact_email, contact_phone,
            location, assigned_manager, status, founded_year, employees_count,
            revenue, website, notes, preferred_contact, follow_up_frequency, next_follow_up
        } = clientData;

        const [result] = await pool.execute(
            `UPDATE clients SET 
                name = ?, industry = ?, contact_person = ?, contact_email = ?, contact_phone = ?,
                location = ?, assigned_manager = ?, status = ?, founded_year = ?, employees_count = ?,
                revenue = ?, website = ?, notes = ?, preferred_contact = ?, follow_up_frequency = ?, next_follow_up = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND tenant_id = ?`,
            [
                name, industry, contact_person, contact_email, contact_phone,
                location, assigned_manager, status, founded_year, employees_count,
                revenue, website, notes, preferred_contact, follow_up_frequency, next_follow_up, id, tenantId
            ]
        );
        return result.affectedRows;
    },

    // Delete client
    delete: async (tenantId, id) => {
        const [result] = await pool.execute(
            'DELETE FROM clients WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return result.affectedRows;
    },

    // Get client interactions
    getInteractions: async (tenantId, clientId) => {
        const [rows] = await pool.execute(
            'SELECT * FROM client_interactions WHERE client_id = ? AND tenant_id = ? ORDER BY date DESC',
            [clientId, tenantId]
        );
        return rows;
    },

    // Add interaction
    addInteraction: async (tenantId, interactionData) => {
        const { client_id, type, date, title, description, participants } = interactionData;
        
        const [result] = await pool.execute(
            'INSERT INTO client_interactions (tenant_id, client_id, type, date, title, description, participants) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [tenantId, client_id, type, date, title, description, JSON.stringify(participants)]
        );
        return result.insertId;
    },

    // Get client projects
    getProjects: async (tenantId, clientId) => {
        const [rows] = await pool.execute(
            'SELECT * FROM client_projects WHERE client_id = ? AND tenant_id = ? ORDER BY created_at DESC',
            [clientId, tenantId]
        );
        return rows;
    },

    // Get client documents
    getDocuments: async (tenantId, clientId) => {
        const [rows] = await pool.execute(
            'SELECT * FROM client_documents WHERE client_id = ? AND tenant_id = ? ORDER BY upload_date DESC',
            [clientId, tenantId]
        );
        return rows;
    },

    // Get managers list
    getManagers: async (tenantId) => {
        const [rows] = await pool.execute(
            `SELECT 
                ed.id,
                ed.user_id,
                u.first_name,
                u.last_name,
                CONCAT(u.first_name, ' ', u.last_name) as name,
                u.email,
                ed.position,
                u.phone
            FROM employee_details ed
            INNER JOIN users u ON ed.user_id = u.id
            WHERE (ed.position LIKE '%manager%' OR 
                   ed.position LIKE '%lead%' OR 
                   ed.position LIKE '%head%' OR 
                   ed.position LIKE '%director%' OR
                   ed.position LIKE '%Administrator%' OR
                   ed.position LIKE '%Senior%' OR
                   ed.position LIKE '%chief%' OR
                   ed.position LIKE '%vp%')
            AND u.is_active = 1 AND ed.tenant_id = ? AND u.tenant_id = ?
            ORDER BY u.first_name, u.last_name`, [tenantId, tenantId]
        );
        return rows;
    },

    // Add new industry
    addIndustry: async (tenantId, industryName) => {
        // First check if industry already exists
        const [existing] = await pool.execute(
            'SELECT id FROM clients WHERE industry = ? AND tenant_id = ? LIMIT 1',
            [industryName, tenantId]
        );
        
        if (existing.length > 0) {
            return existing[0].id; // Industry already exists
        }

        // Industry doesn't exist, we'll just return success
        // Since industries are stored in client records, we don't need a separate table
        return true;
    },

    // Check if client email already exists
    checkEmailExists: async (tenantId, email, excludeId = null) => {
        let query = 'SELECT id FROM clients WHERE contact_email = ? AND tenant_id = ?';
        const params = [email, tenantId];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const [rows] = await pool.execute(query, params);
        return rows.length > 0;
    }
};

module.exports = Client;