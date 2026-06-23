const db = require('../config/database');

class Task {
    // Create a new task
    static async create(taskData) {
        const {
            tenant_id,
            project_id,
            team_id,
            title,
            description,
            priority = 'Medium',
            status = 'To-Do',
            progress = 0,
            estimated_hours = 0,
            actual_hours = 0,
            assigned_to_team_lead,
            assigned_to_member,
            assigned_by,
            assigned_by_name,
            due_date,
            start_date,
            created_by
        } = taskData;

        const query = `
            INSERT INTO tasks (
                tenant_id, project_id, team_id, title, description, priority, 
                status, progress, estimated_hours, actual_hours, 
                assigned_to_team_lead, assigned_to_member, assigned_by, 
                assigned_by_name, due_date, start_date, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(query, [
            tenant_id, project_id, team_id, title, description, priority,
            status, progress, estimated_hours, actual_hours,
            assigned_to_team_lead, assigned_to_member, assigned_by,
            assigned_by_name, due_date, start_date, created_by
        ]);

        return this.findById(result.insertId, tenant_id);
    }

    // Get all tasks with filters
    static async getAll(tenant_id, filters = {}) {
        let query = `
            SELECT t.*,
                   p.name as project_name,
                   tm.name as team_name,
                   lead.name as team_lead_name,
                   member.name as assigned_member_name,
                   creator.name as created_by_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN teams tm ON t.team_id = tm.id
            LEFT JOIN employees lead ON t.assigned_to_team_lead = lead.id
            LEFT JOIN employees member ON t.assigned_to_member = member.id
            LEFT JOIN employees creator ON t.created_by = creator.id
            WHERE t.tenant_id = ?
        `;
        
        const values = [tenant_id];
        
        // Apply filters
        if (filters.project_id) {
            query += ` AND t.project_id = ?`;
            values.push(filters.project_id);
        }
        
        if (filters.team_id) {
            query += ` AND t.team_id = ?`;
            values.push(filters.team_id);
        }
        
        if (filters.status) {
            query += ` AND t.status = ?`;
            values.push(filters.status);
        }
        
        if (filters.priority) {
            query += ` AND t.priority = ?`;
            values.push(filters.priority);
        }
        
        if (filters.assigned_to_member) {
            query += ` AND t.assigned_to_member = ?`;
            values.push(filters.assigned_to_member);
        }
        
        if (filters.assigned_to_team_lead) {
            query += ` AND t.assigned_to_team_lead = ?`;
            values.push(filters.assigned_to_team_lead);
        }
        
        query += ` ORDER BY t.created_at DESC`;
        
        const [rows] = await db.execute(query, values);
        return rows;
    }

    // Get tasks by employee
    static async getTasksByEmployee(tenant_id, employee_id) {
        const query = `
            SELECT t.*,
                   p.name as project_name,
                   tm.name as team_name,
                   lead.name as team_lead_name,
                   member.name as assigned_member_name,
                   creator.name as created_by_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN teams tm ON t.team_id = tm.id
            LEFT JOIN employees lead ON t.assigned_to_team_lead = lead.id
            LEFT JOIN employees member ON t.assigned_to_member = member.id
            LEFT JOIN employees creator ON t.created_by = creator.id
            WHERE t.tenant_id = ? 
              AND (t.assigned_to_team_lead = ? OR t.assigned_to_member = ?)
            ORDER BY t.due_date ASC, t.priority DESC
        `;
        
        const [rows] = await db.execute(query, [tenant_id, employee_id, employee_id]);
        return rows;
    }

    // Get tasks by project
    static async getTasksByProject(tenant_id, project_id) {
        const query = `
            SELECT t.*,
                   tm.name as team_name,
                   member.name as assigned_member_name,
                   lead.name as team_lead_name
            FROM tasks t
            LEFT JOIN teams tm ON t.team_id = tm.id
            LEFT JOIN employees member ON t.assigned_to_member = member.id
            LEFT JOIN employees lead ON t.assigned_to_team_lead = lead.id
            WHERE t.tenant_id = ? AND t.project_id = ?
            ORDER BY t.created_at DESC
        `;
        
        const [rows] = await db.execute(query, [tenant_id, project_id]);
        return rows;
    }

    // Get tasks by team
    static async getTasksByTeam(tenant_id, team_id) {
        const query = `
            SELECT t.*,
                   p.name as project_name,
                   member.name as assigned_member_name,
                   lead.name as team_lead_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN employees member ON t.assigned_to_member = member.id
            LEFT JOIN employees lead ON t.assigned_to_team_lead = lead.id
            WHERE t.tenant_id = ? AND t.team_id = ?
            ORDER BY t.created_at DESC
        `;
        
        const [rows] = await db.execute(query, [tenant_id, team_id]);
        return rows;
    }

    // Find task by ID
    static async findById(id, tenant_id) {
        const query = `
            SELECT t.*,
                   p.name as project_name,
                   tm.name as team_name,
                   lead.name as team_lead_name,
                   member.name as assigned_member_name,
                   creator.name as created_by_name,
                   reviewer.name as reviewed_by_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN teams tm ON t.team_id = tm.id
            LEFT JOIN employees lead ON t.assigned_to_team_lead = lead.id
            LEFT JOIN employees member ON t.assigned_to_member = member.id
            LEFT JOIN employees creator ON t.created_by = creator.id
            LEFT JOIN employees reviewer ON t.reviewed_by = reviewer.id
            WHERE t.id = ? AND t.tenant_id = ?
        `;
        
        const [rows] = await db.execute(query, [id, tenant_id]);
        return rows[0];
    }

    // Update task
    static async update(id, tenant_id, updateData) {
        const fields = [];
        const values = [];
        
        const allowedFields = [
            'project_id', 'team_id', 'title', 'description', 'priority',
            'status', 'progress', 'estimated_hours', 'actual_hours',
            'assigned_to_team_lead', 'assigned_to_member', 'due_date',
            'start_date', 'completed_date', 'accepted', 'accepted_date',
            'review_status', 'review_comments', 'review_date', 'reviewed_by',
            'blocked_reason'
        ];
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }
        
        if (fields.length === 0) return null;
        
        values.push(id, tenant_id);
        const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`;
        
        await db.execute(query, values);
        return this.findById(id, tenant_id);
    }

    // Update task status
    static async updateStatus(id, tenant_id, status, employee_id = null) {
        let query = `UPDATE tasks SET status = ?`;
        const values = [status];
        
        if (status === 'Completed') {
            values.push(new Date());
            query += `, completed_date = ?`;
        }
        
        if (status === 'In Progress') {
            values.push(new Date());
            query += `, start_date = ?`;
        }
        
        values.push(id, tenant_id);
        query += ` WHERE id = ? AND tenant_id = ?`;
        
        await db.execute(query, values);
        return this.findById(id, tenant_id);
    }

    // Accept task
    static async acceptTask(id, tenant_id, employee_id, employee_name) {
        const query = `
            UPDATE tasks 
            SET accepted = 1, 
                accepted_date = NOW(),
                review_status = 'Approved'
            WHERE id = ? AND tenant_id = ? 
              AND (assigned_to_team_lead = ? OR assigned_to_member = ?)
        `;
        
        await db.execute(query, [id, tenant_id, employee_id, employee_id]);
        return this.findById(id, tenant_id);
    }

    // Add time log
    static async addTimeLog(task_id, tenant_id, employee_id, hours, description) {
        const query = `
            INSERT INTO task_time_logs (task_id, tenant_id, employee_id, hours, description, logged_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        
        await db.execute(query, [task_id, tenant_id, employee_id, hours, description]);
        
        // Update actual hours in tasks table
        await db.execute(`
            UPDATE tasks 
            SET actual_hours = actual_hours + ?
            WHERE id = ? AND tenant_id = ?
        `, [hours, task_id, tenant_id]);
        
        return true;
    }

    // Get time logs for task
    static async getTimeLogs(task_id, tenant_id) {
        const query = `
            SELECT ttl.*, e.name as employee_name
            FROM task_time_logs ttl
            LEFT JOIN employees e ON ttl.employee_id = e.id
            WHERE ttl.task_id = ? AND ttl.tenant_id = ?
            ORDER BY ttl.logged_at DESC
        `;
        
        const [rows] = await db.execute(query, [task_id, tenant_id]);
        return rows;
    }

    // Get overdue tasks
    static async getOverdueTasks(tenant_id) {
        const query = `
            SELECT t.*, p.name as project_name,
                   member.name as assigned_member_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN employees member ON t.assigned_to_member = member.id
            WHERE t.tenant_id = ? 
              AND t.status NOT IN ('Completed', 'Cancelled')
              AND t.due_date < CURDATE()
            ORDER BY t.due_date ASC
        `;
        
        const [rows] = await db.execute(query, [tenant_id]);
        return rows;
    }

    // Get blocked tasks
    static async getBlockedTasks(tenant_id) {
        const query = `
            SELECT t.*, p.name as project_name,
                   member.name as assigned_member_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN employees member ON t.assigned_to_member = member.id
            WHERE t.tenant_id = ? AND t.status = 'Blocked'
            ORDER BY t.updated_at DESC
        `;
        
        const [rows] = await db.execute(query, [tenant_id]);
        return rows;
    }

    // Delete task
    static async delete(id, tenant_id) {
        const query = `DELETE FROM tasks WHERE id = ? AND tenant_id = ?`;
        const [result] = await db.execute(query, [id, tenant_id]);
        return result.affectedRows > 0;
    }

    // Bulk update status
    static async bulkUpdateStatus(tenant_id, taskIds, status) {
        const placeholders = taskIds.map(() => '?').join(',');
        const query = `
            UPDATE tasks 
            SET status = ? 
            WHERE id IN (${placeholders}) AND tenant_id = ?
        `;
        
        const [result] = await db.execute(query, [status, ...taskIds, tenant_id]);
        return result.affectedRows;
    }

    // Bulk assign tasks
    static async bulkAssignTasks(tenant_id, taskIds, assigned_to_member) {
        const placeholders = taskIds.map(() => '?').join(',');
        const query = `
            UPDATE tasks 
            SET assigned_to_member = ? 
            WHERE id IN (${placeholders}) AND tenant_id = ?
        `;
        
        const [result] = await db.execute(query, [assigned_to_member, ...taskIds, tenant_id]);
        return result.affectedRows;
    }
}

module.exports = Task;