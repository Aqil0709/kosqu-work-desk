// controllers/taskController.js
const db = require('../config/database');

const taskController = {
  getAllTasks: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const { project_id, team_id, status, priority, assigned_to_member } = req.query;
            
            let query = `
                SELECT 
                    t.*,
                    p.name as project_name,
                    CONCAT(u_assigned.first_name, ' ', u_assigned.last_name) as assigned_to_name,
                    CONCAT(u_created.first_name, ' ', u_created.last_name) as created_by_name
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id AND p.tenant_id = ?
                LEFT JOIN users u_assigned ON t.assigned_to_member = u_assigned.id
                LEFT JOIN users u_created ON t.created_by = u_created.id
                WHERE t.tenant_id = ? AND (t.status IS NULL OR t.status != 'Cancelled')
            `;
            
            const values = [tenant_id, tenant_id];
            
            if (project_id) {
                query += ` AND t.project_id = ?`;
                values.push(project_id);
            }
            
            if (team_id) {
                query += ` AND t.team_id = ?`;
                values.push(team_id);
            }
            
            if (status) {
                query += ` AND t.status = ?`;
                values.push(status);
            }
            
            if (priority) {
                query += ` AND t.priority = ?`;
                values.push(priority);
            }
            
            if (assigned_to_member) {
                query += ` AND t.assigned_to_member = ?`;
                values.push(assigned_to_member);
            }
            
            query += ` ORDER BY t.created_at DESC`;
            
            const [tasks] = await db.execute(query, values);
            
            console.log(`Active tasks found (excluding cancelled): ${tasks.length}`);
            
            res.json({ 
                success: true, 
                data: tasks,
                message: 'Tasks retrieved successfully'
            });
        } catch (error) {
            console.error('Get all tasks error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch tasks: ' + error.message 
            });
        }
    },

   getTasksByProject: async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || req.tenantId;
        const { projectId } = req.params;
        
        const [tasks] = await db.execute(`
            SELECT 
                t.*,
                p.name as project_name,
                tm.name as team_name,
                CONCAT(u_lead.first_name, ' ', u_lead.last_name) as team_lead_name,
                CONCAT(u_member.first_name, ' ', u_member.last_name) as assigned_member_name,
                CONCAT(u_creator.first_name, ' ', u_creator.last_name) as created_by_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN teams tm ON t.team_id = tm.id
            LEFT JOIN employee_details e_lead ON t.assigned_to_team_lead = e_lead.id
            LEFT JOIN users u_lead ON e_lead.user_id = u_lead.id
            LEFT JOIN employee_details e_member ON t.assigned_to_member = e_member.id
            LEFT JOIN users u_member ON e_member.user_id = u_member.id
            LEFT JOIN employee_details e_creator ON t.created_by = e_creator.id
            LEFT JOIN users u_creator ON e_creator.user_id = u_creator.id
            WHERE t.tenant_id = ? 
                AND t.project_id = ?
                AND t.status != 'Cancelled'  // Add this line
            ORDER BY t.created_at DESC
        `, [tenant_id, projectId]);
        
        res.json({ 
            success: true, 
            data: tasks 
        });
    } catch (error) {
        console.error('Get tasks by project error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch tasks: ' + error.message 
        });
    }
},
getMyTasks: async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || req.tenantId;
        const [employees] = await db.execute(
            'SELECT id FROM employee_details WHERE user_id = ? AND tenant_id = ?',
            [req.user.id, tenant_id]
        );

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee record not found'
            });
        }

        const employee_id = employees[0].id;
        
        const [tasks] = await db.execute(`
            SELECT 
                t.*,
                p.name as project_name,
                tm.name as team_name,
                CONCAT(u_lead.first_name, ' ', u_lead.last_name) as team_lead_name,
                CONCAT(u_member.first_name, ' ', u_member.last_name) as assigned_member_name,
                CONCAT(u_creator.first_name, ' ', u_creator.last_name) as created_by_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN teams tm ON t.team_id = tm.id
            LEFT JOIN employee_details e_lead ON t.assigned_to_team_lead = e_lead.id
            LEFT JOIN users u_lead ON e_lead.user_id = u_lead.id
            LEFT JOIN employee_details e_member ON t.assigned_to_member = e_member.id
            LEFT JOIN users u_member ON e_member.user_id = u_member.id
            LEFT JOIN employee_details e_creator ON t.created_by = e_creator.id
            LEFT JOIN users u_creator ON e_creator.user_id = u_creator.id
            WHERE t.tenant_id = ? 
                AND (t.assigned_to_team_lead = ? OR t.assigned_to_member = ?)
                AND t.status != 'Cancelled'  // Add this line
            ORDER BY t.due_date ASC, t.priority DESC
        `, [tenant_id, employee_id, employee_id]);
        
        res.json({ 
            success: true, 
            data: tasks 
        });
    } catch (error) {
        console.error('Get my tasks error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch tasks: ' + error.message 
        });
    }
},

    // Get overdue tasks
    getOverdueTasks: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            
            const [tasks] = await db.execute(`
                SELECT 
                    t.*,
                    p.name as project_name,
                    CONCAT(u_member.first_name, ' ', u_member.last_name) as assigned_member_name
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
                LEFT JOIN employee_details e_member ON t.assigned_to_member = e_member.id
                LEFT JOIN users u_member ON e_member.user_id = u_member.id
                WHERE t.tenant_id = ? 
                  AND t.status NOT IN ('Completed', 'Cancelled')
                  AND t.due_date < CURDATE()
                ORDER BY t.due_date ASC
            `, [tenant_id]);
            
            res.json({ 
                success: true, 
                data: tasks 
            });
        } catch (error) {
            console.error('Get overdue tasks error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch overdue tasks: ' + error.message 
            });
        }
    },

    // Get blocked tasks
    getBlockedTasks: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            
            const [tasks] = await db.execute(`
                SELECT 
                    t.*,
                    p.name as project_name,
                    CONCAT(u_member.first_name, ' ', u_member.last_name) as assigned_member_name
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
                LEFT JOIN employee_details e_member ON t.assigned_to_member = e_member.id
                LEFT JOIN users u_member ON e_member.user_id = u_member.id
                WHERE t.tenant_id = ? AND t.status = 'Blocked'
                ORDER BY t.updated_at DESC
            `, [tenant_id]);
            
            res.json({ 
                success: true, 
                data: tasks 
            });
        } catch (error) {
            console.error('Get blocked tasks error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch blocked tasks: ' + error.message 
            });
        }
    },

createTask: async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || req.tenantId || 1;
        const {
            title,
            description,
            priority,
            estimated_hours,
            due_date,
            project_id,
            team_id,
            assigned_by,
            assigned_by_name,
            status,
            review_status,
            progress,
            assigned_to_member
        } = req.body;
        
        console.log('========== CREATE TASK DEBUG ==========');
        console.log('Received assigned_to_member:', assigned_to_member);
        console.log('Type:', typeof assigned_to_member);
        
        // Validate
        if (!title) {
            return res.status(400).json({ success: false, message: 'Task title is required' });
        }
        if (!project_id) {
            return res.status(400).json({ success: false, message: 'Project ID is required' });
        }
        if (!assigned_to_member) {
            return res.status(400).json({ success: false, message: 'Assigned member is required' });
        }
        
        // Check if the user exists in users table
        const [userExists] = await db.execute(
            'SELECT id FROM users WHERE id = ?',
            [assigned_to_member]
        );
        
        if (userExists.length === 0) {
            console.error(`❌ User with ID ${assigned_to_member} not found in users table`);
            return res.status(400).json({ 
                success: false, 
                message: `User with ID ${assigned_to_member} not found. Please check the user ID.` 
            });
        }
        
        console.log(`✅ User ${assigned_to_member} exists`);
        
        // Insert task
        const [result] = await db.execute(`
            INSERT INTO tasks (
                tenant_id, title, description, priority, estimated_hours,
                due_date, project_id, team_id, assigned_by, assigned_by_name,
                status, review_status, progress, assigned_to_member,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            tenant_id, title || null, description || null, priority || 'Medium',
            estimated_hours || 0, due_date || null, project_id, team_id || null,
            assigned_by || null, assigned_by_name || null, status || 'To-Do',
            review_status || 'Not Reviewed', progress || 0, assigned_to_member
        ]);
        
        // Fetch the created task with user name
        const [newTask] = await db.execute(`
            SELECT t.*, p.name as project_name,
                   CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assigned_to_member = u.id
            WHERE t.id = ?
        `, [result.insertId]);
        
        console.log(`✅ Task created with ID: ${result.insertId}, assigned to user: ${assigned_to_member}`);
        
        res.status(201).json({
            success: true,
            data: newTask[0],
            message: 'Task created successfully'
        });
        
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create task: ' + error.message
        });
    }
},

    // Get task by ID
    getTaskById: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            
            const [tasks] = await db.execute(`
                SELECT 
                    t.*,
                    p.name as project_name,
                    tm.name as team_name,
                    CONCAT(u_lead.first_name, ' ', u_lead.last_name) as team_lead_name,
                    CONCAT(u_member.first_name, ' ', u_member.last_name) as assigned_member_name,
                    CONCAT(u_creator.first_name, ' ', u_creator.last_name) as created_by_name,
                    CONCAT(u_reviewer.first_name, ' ', u_reviewer.last_name) as reviewed_by_name
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
                LEFT JOIN teams tm ON t.team_id = tm.id
                LEFT JOIN employee_details e_lead ON t.assigned_to_team_lead = e_lead.id
                LEFT JOIN users u_lead ON e_lead.user_id = u_lead.id
                LEFT JOIN employee_details e_member ON t.assigned_to_member = e_member.id
                LEFT JOIN users u_member ON e_member.user_id = u_member.id
                LEFT JOIN employee_details e_creator ON t.created_by = e_creator.id
                LEFT JOIN users u_creator ON e_creator.user_id = u_creator.id
                LEFT JOIN employee_details e_reviewer ON t.reviewed_by = e_reviewer.id
                LEFT JOIN users u_reviewer ON e_reviewer.user_id = u_reviewer.id
                WHERE t.id = ? AND t.tenant_id = ?
            `, [id, tenant_id]);
            
            if (tasks.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Task not found' 
                });
            }
            
            res.json({ 
                success: true, 
                data: tasks[0] 
            });
        } catch (error) {
            console.error('Get task by ID error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch task: ' + error.message 
            });
        }
    },

   updateTask: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const { id } = req.params;
            const updateData = req.body;
            
            console.log(`Updating task ${id} with data:`, updateData);
            
            const allowedFields = [
                'title', 'description', 'priority', 'status', 'progress',
                'estimated_hours', 'actual_hours', 'due_date', 'remarks',
                'assigned_to_member', 'review_status', 'review_comments'
            ];
            
            const updates = [];
            const values = [];
            
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    updates.push(`${field} = ?`);
                    values.push(updateData[field]);
                }
            }
            
            if (updates.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No fields to update' 
                });
            }
            
            updates.push('updated_at = NOW()');
            values.push(id, tenant_id);
            
            const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`;
            await db.execute(query, values);
            
            const [updatedTask] = await db.execute(`
                SELECT t.*, p.name as project_name
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
                WHERE t.id = ? AND t.tenant_id = ?
            `, [id, tenant_id]);
            
            console.log(`Task updated successfully. New status: ${updatedTask[0]?.status}`);
            
            res.json({ 
                success: true, 
                data: updatedTask[0],
                message: 'Task updated successfully'
            });
            
        } catch (error) {
            console.error('Update task error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update task: ' + error.message 
            });
        }
    },

    // Delete task (soft delete - set status to Cancelled)
    deleteTask: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const { id } = req.params;
            
            console.log(`Soft deleting task ${id} for tenant ${tenant_id}`);
            
            const [result] = await db.execute(`
                UPDATE tasks 
                SET status = 'Cancelled', 
                    updated_at = NOW()
                WHERE id = ? AND tenant_id = ?
            `, [id, tenant_id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }
            
            res.json({ success: true, message: 'Task deleted successfully' });
        } catch (error) {
            console.error('Delete task error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete task: ' + error.message });
        }
    },
    // Accept task
    acceptTask: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            const employee_id = req.user?.employee_id || req.employeeId;
            
            const [result] = await db.execute(`
                UPDATE tasks 
                SET accepted = 1, 
                    accepted_date = NOW(),
                    review_status = 'Approved'
                WHERE id = ? AND tenant_id = ? 
                  AND (assigned_to_team_lead = ? OR assigned_to_member = ?)
            `, [id, tenant_id, employee_id, employee_id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Task not found or not assigned to you' 
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Task accepted successfully' 
            });
            
        } catch (error) {
            console.error('Accept task error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to accept task: ' + error.message 
            });
        }
    },

    // Add comment to task
    addTaskComment: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            const { comment } = req.body;
            const employee_id = req.user?.employee_id || req.employeeId;
            const employee_name = req.user?.name || req.user?.fullName;
            
            if (!comment) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Comment is required' 
                });
            }
            
            await db.execute(`
                INSERT INTO task_comments (task_id, tenant_id, employee_id, employee_name, comment, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [id, tenant_id, employee_id, employee_name, comment]);
            
            res.status(201).json({ 
                success: true, 
                message: 'Comment added successfully' 
            });
            
        } catch (error) {
            console.error('Add comment error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to add comment: ' + error.message 
            });
        }
    },

    // Get task comments
    getTaskComments: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            
            const [comments] = await db.execute(`
                SELECT * FROM task_comments 
                WHERE task_id = ? AND tenant_id = ?
                ORDER BY created_at DESC
            `, [id, tenant_id]);
            
            res.json({ 
                success: true, 
                data: comments 
            });
        } catch (error) {
            console.error('Get comments error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch comments: ' + error.message 
            });
        }
    },

    // Add time log
    addTimeLog: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            const { hours, description } = req.body;
            const employee_id = req.user?.employee_id || req.employeeId;
            
            if (!hours) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Hours are required' 
                });
            }
            
            // Add time log
            await db.execute(`
                INSERT INTO task_time_logs (task_id, tenant_id, employee_id, hours, description, logged_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [id, tenant_id, employee_id, hours, description || null]);
            
            // Update actual hours in tasks table
            await db.execute(`
                UPDATE tasks 
                SET actual_hours = actual_hours + ?
                WHERE id = ? AND tenant_id = ?
            `, [hours, id, tenant_id]);
            
            res.json({ 
                success: true, 
                message: 'Time log added successfully' 
            });
            
        } catch (error) {
            console.error('Add time log error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to add time log: ' + error.message 
            });
        }
    },

    // Get time logs
    getTimeLogs: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            
            const [logs] = await db.execute(`
                SELECT ttl.*, CONCAT(u.first_name, ' ', u.last_name) as employee_name
                FROM task_time_logs ttl
                LEFT JOIN employee_details e ON ttl.employee_id = e.id
                LEFT JOIN users u ON e.user_id = u.id
                WHERE ttl.task_id = ? AND ttl.tenant_id = ?
                ORDER BY ttl.logged_at DESC
            `, [id, tenant_id]);
            
            res.json({ 
                success: true, 
                data: logs 
            });
        } catch (error) {
            console.error('Get time logs error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch time logs: ' + error.message 
            });
        }
    },

    // Assign task to team lead
    assignToTeamLead: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            const { team_lead_id } = req.body;
            
            await db.execute(`
                UPDATE tasks 
                SET assigned_to_team_lead = ?
                WHERE id = ? AND tenant_id = ?
            `, [team_lead_id || null, id, tenant_id]);
            
            res.json({ 
                success: true, 
                message: 'Task assigned to team lead successfully' 
            });
            
        } catch (error) {
            console.error('Assign to team lead error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to assign task: ' + error.message 
            });
        }
    },

    // Assign task to member
    assignToMember: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            const { member_id } = req.body;
            
            await db.execute(`
                UPDATE tasks 
                SET assigned_to_member = ?
                WHERE id = ? AND tenant_id = ?
            `, [member_id || null, id, tenant_id]);
            
            res.json({ 
                success: true, 
                message: 'Task assigned to member successfully' 
            });
            
        } catch (error) {
            console.error('Assign to member error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to assign task: ' + error.message 
            });
        }
    },

    // Bulk update status
    bulkUpdateStatus: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { taskIds, status } = req.body;
            
            if (!taskIds || !taskIds.length) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Task IDs are required' 
                });
            }
            
            const placeholders = taskIds.map(() => '?').join(',');
            const [result] = await db.execute(`
                UPDATE tasks 
                SET status = ? 
                WHERE id IN (${placeholders}) AND tenant_id = ?
            `, [status, ...taskIds, tenant_id]);
            
            res.json({ 
                success: true, 
                message: `${result.affectedRows} task(s) updated successfully` 
            });
            
        } catch (error) {
            console.error('Bulk update status error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update tasks: ' + error.message 
            });
        }
    },

    // Bulk assign tasks
    bulkAssignTasks: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { taskIds, assigned_to_member } = req.body;
            
            if (!taskIds || !taskIds.length) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Task IDs are required' 
                });
            }
            
            const placeholders = taskIds.map(() => '?').join(',');
            const [result] = await db.execute(`
                UPDATE tasks 
                SET assigned_to_member = ? 
                WHERE id IN (${placeholders}) AND tenant_id = ?
            `, [assigned_to_member || null, ...taskIds, tenant_id]);
            
            res.json({ 
                success: true, 
                message: `${result.affectedRows} task(s) assigned successfully` 
            });
            
        } catch (error) {
            console.error('Bulk assign tasks error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to assign tasks: ' + error.message 
            });
        }
    },

    // Bulk assign members (multiple employees to one task)
    bulkAssignMembers: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            const { memberIds } = req.body;
            
            if (!memberIds || !memberIds.length) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Member IDs are required' 
                });
            }
            
            // For now, assign only the first member
            await db.execute(`
                UPDATE tasks 
                SET assigned_to_member = ?
                WHERE id = ? AND tenant_id = ?
            `, [memberIds[0] || null, id, tenant_id]);
            
            res.json({ 
                success: true, 
                message: `${memberIds.length} member(s) assigned to task successfully` 
            });
            
        } catch (error) {
            console.error('Bulk assign members error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to assign members: ' + error.message 
            });
        }
    }
};

module.exports = taskController;
