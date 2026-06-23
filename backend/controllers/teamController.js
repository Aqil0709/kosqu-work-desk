const db = require('../config/database');

const teamController = {
    getAllTeams: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            
            // Only get ACTIVE teams
            const [teams] = await db.execute(`
                SELECT 
                    t.id,
                    t.name,
                    t.project_id,
                    p.name as project_name,
                    t.team_lead_id,
                    CONCAT(u.first_name, ' ', u.last_name) as team_lead_name,
                    t.description,
                    t.status,
                    t.created_at
                FROM teams t
                LEFT JOIN projects p ON t.project_id = p.id AND p.tenant_id = ?
                LEFT JOIN users u ON t.team_lead_id = u.id
                WHERE t.tenant_id = ? AND t.status = 'Active'
                ORDER BY t.created_at DESC
            `, [tenant_id, tenant_id]);
            
            console.log('Active teams found:', teams.length);
            
            // Get members for active teams only
            for (let team of teams) {
                const [members] = await db.execute(`
                    SELECT 
                        tm.id,
                        tm.employee_id,
                        CONCAT(u.first_name, ' ', u.last_name) as name,
                        u.email,
                        tm.role_in_team
                    FROM team_members tm
                    INNER JOIN users u ON tm.employee_id = u.id
                    WHERE tm.team_id = ? AND tm.is_active = 1
                    ORDER BY u.first_name ASC
                `, [team.id]);
                
                team.members = members || [];
                team.member_count = (members || []).length;
            }
            
            res.json({ 
                success: true, 
                data: teams,
                message: 'Teams retrieved successfully'
            });
        } catch (error) {
            console.error('Get all teams error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch teams: ' + error.message 
            });
        }
    },

   


    // Create team with members - FIXED FOR STRING IDs
    createTeam: async (req, res) => {
        let connection;
        try {
            console.log('\n========== CREATE TEAM ==========');
            console.log('Request body:', JSON.stringify(req.body, null, 2));
            
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const { name, project_id, team_lead_id, description, status, members } = req.body;
            
            console.log('Extracted data:', { tenant_id, name, project_id, team_lead_id, members });
            console.log('Members type:', typeof members, 'Is array:', Array.isArray(members));
            
            // Validation
            if (!name) {
                return res.status(400).json({ success: false, message: 'Team name is required' });
            }
            if (!project_id) {
                return res.status(400).json({ success: false, message: 'Project ID is required' });
            }
            if (!members || !Array.isArray(members) || members.length === 0) {
                return res.status(400).json({ success: false, message: 'Please select at least one team member' });
            }
            
            // Get connection for transaction
            connection = await db.getConnection();
            await connection.beginTransaction();
            
            // Check if project exists
            const [projectExists] = await connection.execute(
                'SELECT id FROM projects WHERE id = ? AND tenant_id = ?',
                [project_id, tenant_id]
            );
            
            if (projectExists.length === 0) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Project not found' });
            }
            
            // Insert team
           const [teamResult] = await connection.execute(`
    INSERT INTO teams (
        tenant_id, 
        name, 
        project_id, 
        team_lead_id, 
        description, 
        status,
        created_at,
        updated_at
    ) VALUES (?, ?, ?, ?, ?, COALESCE(?, 'Active'), NOW(), NOW())
`, [tenant_id, name, project_id, team_lead_id || null, description || null, status || 'Active']);
            
            const teamId = teamResult.insertId;
            console.log('Team created with ID:', teamId);
            
            // CRITICAL FIX: Handle string IDs (like "EMP001") from employee_details
            const employeeDetailIds = members.map(id => String(id).trim()); // Keep as string, don't parseInt
            console.log('Employee Detail IDs (as strings):', employeeDetailIds);
            
            // Get the user_id for each employee_detail_id (string ID)
            let userMappings = [];
            if (employeeDetailIds.length > 0) {
                const placeholders = employeeDetailIds.map(() => '?').join(',');
                const [mappings] = await connection.execute(`
                    SELECT ed.id as employee_detail_id, ed.user_id
                    FROM employee_details ed
                    WHERE ed.id IN (${placeholders}) AND ed.tenant_id = ?
                `, [...employeeDetailIds, tenant_id]);
                userMappings = mappings;
                console.log('Employee to User mappings:', userMappings);
            }
            
            // If no mappings found, show which IDs are missing
            if (userMappings.length === 0) {
                console.log('No mappings found for employee_detail_ids:', employeeDetailIds);
                // Try to see what IDs exist in employee_details
                const [allEmployeeDetails] = await connection.execute(
                    'SELECT id, user_id FROM employee_details WHERE tenant_id = ? LIMIT 10',
                    [tenant_id]
                );
                console.log('Sample employee_details in DB:', allEmployeeDetails);
            }
            
            // Create a map for quick lookup
            const userMap = {};
            userMappings.forEach(map => {
                userMap[map.employee_detail_id] = map.user_id;
            });
            
            // Add members using the mapped user_id
            let memberCount = 0;
            const addedMembers = [];
            
            for (const memberId of employeeDetailIds) {
                const userId = userMap[memberId];
                console.log(`Processing: employee_detail_id="${memberId}" -> user_id=${userId}`);
                
                if (userId && !isNaN(parseInt(userId))) {
                    try {
                        // Check if user exists
                        const [users] = await connection.execute(
                            'SELECT id, first_name, last_name FROM users WHERE id = ?',
                            [userId]
                        );
                        
                        if (users.length > 0) {
                            // Check if member already exists
                            const [existing] = await connection.execute(
                                'SELECT id FROM team_members WHERE team_id = ? AND employee_id = ? AND is_active = 1',
                                [teamId, userId]
                            );
                            
                            if (existing.length === 0) {
                                // Insert into team_members using user_id
                                const [insertResult] = await connection.execute(`
                                    INSERT INTO team_members (
                                        tenant_id, 
                                        team_id, 
                                        employee_id, 
                                        role_in_team, 
                                        is_active, 
                                        joined_at
                                    ) VALUES (?, ?, ?, ?, 1, NOW())
                                `, [tenant_id, teamId, userId, 'Member']);
                                
                                if (insertResult.affectedRows > 0) {
                                    memberCount++;
                                    addedMembers.push({
                                        employee_detail_id: memberId,
                                        user_id: userId,
                                        name: `${users[0].first_name} ${users[0].last_name}`
                                    });
                                    console.log(`✓ Member added: ${users[0].first_name} ${users[0].last_name}`);
                                }
                            } else {
                                console.log(`ℹ Member already exists in team`);
                            }
                        } else {
                            console.log(`✗ User ${userId} not found in users table`);
                        }
                    } catch (err) {
                        console.error(`Error adding member:`, err.message);
                    }
                } else {
                    console.log(`✗ No user mapping found for employee_detail_id: "${memberId}"`);
                }
            }
            
            if (memberCount === 0) {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Failed to add any members. Please check if the employee IDs exist in employee_details table.',
                    debug: {
                        requested_ids: employeeDetailIds,
                        found_mappings: userMappings
                    }
                });
            }
            
            await connection.commit();
            console.log(`✓ Transaction committed. Added ${memberCount} members`);
            
            // Fetch the created team
            const [newTeam] = await connection.execute(`
                SELECT 
                    t.id,
                    t.name,
                    t.project_id,
                    p.name as project_name,
                    t.team_lead_id,
                    CONCAT(u.first_name, ' ', u.last_name) as team_lead_name,
                    t.description,
                    t.status,
                    t.created_at
                FROM teams t
                LEFT JOIN projects p ON t.project_id = p.id AND p.tenant_id = ?
                LEFT JOIN users u ON t.team_lead_id = u.id
                WHERE t.id = ? AND t.tenant_id = ?
            `, [tenant_id, teamId, tenant_id]);
            
            // Fetch team members
            const [teamMembers] = await connection.execute(`
                SELECT 
                    tm.id,
                    tm.employee_id as user_id,
                    tm.role_in_team,
                    tm.joined_at,
                    CONCAT(u.first_name, ' ', u.last_name) as name,
                    u.email,
                    ed.id as employee_detail_id,
                    ed.position
                FROM team_members tm
                INNER JOIN users u ON tm.employee_id = u.id
                LEFT JOIN employee_details ed ON u.id = ed.user_id AND ed.tenant_id = ?
                WHERE tm.team_id = ? 
                    AND tm.is_active = 1 
                    AND tm.tenant_id = ?
                ORDER BY u.first_name ASC
            `, [tenant_id, teamId, tenant_id]);
            
            const result = {
                ...newTeam[0],
                members: teamMembers,
                member_count: teamMembers.length
            };
            
            console.log('Final team:', { 
                id: result.id, 
                name: result.name, 
                member_count: result.member_count 
            });
            console.log('========== SUCCESS ==========\n');
            
            res.status(201).json({
                success: true,
                data: result,
                message: `Team "${name}" created successfully with ${memberCount} member(s)`
            });
            
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('\n========== ERROR ==========');
            console.error('Error:', error);
            console.error('Stack:', error.stack);
            console.error('==========================\n');
            
            res.status(500).json({
                success: false,
                message: 'Failed to create team: ' + error.message
            });
        } finally {
            if (connection) connection.release();
        }
    },

    // Get team by ID
    getTeamById: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const { id } = req.params;
            
            const [teams] = await db.execute(`
                SELECT 
                    t.id,
                    t.name,
                    t.project_id,
                    p.name as project_name,
                    t.team_lead_id,
                    CONCAT(u.first_name, ' ', u.last_name) as team_lead_name,
                    t.description,
                    t.status,
                    t.created_at
                FROM teams t
                LEFT JOIN projects p ON t.project_id = p.id AND p.tenant_id = ?
                LEFT JOIN users u ON t.team_lead_id = u.id
                WHERE t.id = ? AND t.tenant_id = ?
            `, [tenant_id, id, tenant_id]);
            
            if (teams.length === 0) {
                return res.status(404).json({ success: false, message: 'Team not found' });
            }
            
            const team = teams[0];
            
            // Get team members
            const [members] = await db.execute(`
                SELECT 
                    tm.id,
                    tm.employee_id as user_id,
                    tm.role_in_team,
                    tm.joined_at,
                    CONCAT(u.first_name, ' ', u.last_name) as name,
                    u.email,
                    ed.id as employee_detail_id,
                    ed.position
                FROM team_members tm
                INNER JOIN users u ON tm.employee_id = u.id
                LEFT JOIN employee_details ed ON u.id = ed.user_id AND ed.tenant_id = ?
                WHERE tm.team_id = ? 
                    AND tm.is_active = 1
                    AND tm.tenant_id = ?
                ORDER BY u.first_name ASC
            `, [tenant_id, id, tenant_id]);
            
            team.members = members;
            team.member_count = members.length;
            
            res.json({ success: true, data: team });
        } catch (error) {
            console.error('Get team by ID error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch team: ' + error.message });
        }
    },

getTeamMembers: async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || req.tenantId || 1;
        const { teamId } = req.params;
        
        console.log(`Fetching members for team: ${teamId}`);
        
        const [members] = await db.execute(`
            SELECT 
                tm.id as team_member_id,
                u.id as user_id,
                CONCAT(u.first_name, ' ', u.last_name) as name,
                u.email,
                COALESCE(ed.position, 'Team Member') as position,
                ed.id as employee_detail_id
            FROM team_members tm
            INNER JOIN users u ON tm.employee_id = u.id
            LEFT JOIN employee_details ed ON u.id = ed.user_id AND ed.tenant_id = ?
            WHERE tm.team_id = ? 
                AND tm.is_active = 1
                AND tm.tenant_id = ?
            ORDER BY u.first_name ASC
        `, [tenant_id, teamId, tenant_id]);
        
        console.log(`Found ${members.length} members:`, members);
        
        // Return both IDs so frontend can use user_id
        const formattedMembers = members.map(member => ({
            id: member.user_id,
            user_id: member.user_id,  // This is the INT user_id
            employee_detail_id: member.employee_detail_id,  // This is the VARCHAR ID
            name: member.name,
            position: member.position || 'Team Member',
            email: member.email || ''
        }));
        
        res.json({ 
            success: true, 
            data: formattedMembers,
            count: formattedMembers.length
        });
    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch members: ' + error.message 
        });
    }
},
    // Add single member to team
    addTeamMember: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const { teamId, employeeId, roleInTeam } = req.body;
            
            if (!teamId || !employeeId) {
                return res.status(400).json({ success: false, message: 'Team ID and Employee ID are required' });
            }
            
            // Map employee_detail_id (string) to user_id
            const [userMapping] = await db.execute(`
                SELECT user_id FROM employee_details 
                WHERE id = ? AND tenant_id = ?
            `, [String(employeeId), tenant_id]);
            
            let userId = employeeId;
            if (userMapping.length > 0) {
                userId = userMapping[0].user_id;
            }
            
            // Check if team exists
            const [teamExists] = await db.execute(
                'SELECT id FROM teams WHERE id = ? AND tenant_id = ?',
                [teamId, tenant_id]
            );
            
            if (teamExists.length === 0) {
                return res.status(404).json({ success: false, message: 'Team not found' });
            }
            
            // Check if user exists
            const [userExists] = await db.execute(
                'SELECT id FROM users WHERE id = ?',
                [userId]
            );
            
            if (userExists.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            // Check if member already exists
            const [existing] = await db.execute(`
                SELECT id FROM team_members 
                WHERE team_id = ? AND employee_id = ? AND is_active = 1
            `, [teamId, userId]);
            
            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Member already exists in this team' });
            }
            
            // Add member to team
            await db.execute(`
                INSERT INTO team_members (tenant_id, team_id, employee_id, role_in_team, is_active, joined_at)
                VALUES (?, ?, ?, ?, 1, NOW())
            `, [tenant_id, teamId, userId, roleInTeam || 'Member']);
            
            res.json({ success: true, message: 'Member added successfully' });
        } catch (error) {
            console.error('Add team member error:', error);
            res.status(500).json({ success: false, message: 'Failed to add member: ' + error.message });
        }
    },

    // Bulk add members
    bulkAddMembers: async (req, res) => {
        let connection;
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const { id } = req.params;
            const { memberIds, roleInTeam } = req.body;
            
            if (!memberIds || !memberIds.length) {
                return res.status(400).json({ success: false, message: 'Member IDs are required' });
            }
            
            connection = await db.getConnection();
            await connection.beginTransaction();
            
            // Check if team exists
            const [teamExists] = await connection.execute(
                'SELECT id FROM teams WHERE id = ? AND tenant_id = ?',
                [id, tenant_id]
            );
            
            if (teamExists.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Team not found' });
            }
            
            // Map employee_detail_ids (strings) to user_ids
            const employeeDetailIds = memberIds.map(mid => String(mid).trim());
            let userMappings = [];
            
            if (employeeDetailIds.length > 0) {
                const placeholders = employeeDetailIds.map(() => '?').join(',');
                const [mappings] = await connection.execute(`
                    SELECT ed.id as employee_detail_id, ed.user_id
                    FROM employee_details ed
                    WHERE ed.id IN (${placeholders}) AND ed.tenant_id = ?
                `, [...employeeDetailIds, tenant_id]);
                userMappings = mappings;
            }
            
            const userMap = {};
            userMappings.forEach(map => {
                userMap[map.employee_detail_id] = map.user_id;
            });
            
            let addedCount = 0;
            let failedCount = 0;
            
            for (const memberId of employeeDetailIds) {
                const userId = userMap[memberId];
                
                if (userId && !isNaN(parseInt(userId))) {
                    try {
                        // Check if already exists
                        const [existing] = await connection.execute(`
                            SELECT id FROM team_members 
                            WHERE team_id = ? AND employee_id = ? AND is_active = 1
                        `, [id, userId]);
                        
                        if (existing.length === 0) {
                            await connection.execute(`
                                INSERT INTO team_members (tenant_id, team_id, employee_id, role_in_team, is_active, joined_at)
                                VALUES (?, ?, ?, ?, 1, NOW())
                            `, [tenant_id, id, userId, roleInTeam || 'Member']);
                            addedCount++;
                        } else {
                            failedCount++;
                        }
                    } catch (err) {
                        failedCount++;
                        console.error(`Error adding member ${memberId}:`, err.message);
                    }
                } else {
                    failedCount++;
                }
            }
            
            await connection.commit();
            
            res.json({ 
                success: true, 
                message: `${addedCount} member(s) added successfully, ${failedCount} failed`,
                data: { addedCount, failedCount }
            });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Bulk add members error:', error);
            res.status(500).json({ success: false, message: 'Failed to add members: ' + error.message });
        } finally {
            if (connection) connection.release();
        }
    },

    // Remove member from team
    removeTeamMember: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const { teamId, employeeId } = req.params;
            
            // Map employee_detail_id (string) to user_id
            let userId = employeeId;
            const [userMapping] = await db.execute(`
                SELECT user_id FROM employee_details 
                WHERE id = ? AND tenant_id = ?
            `, [String(employeeId), tenant_id]);
            
            if (userMapping.length > 0) {
                userId = userMapping[0].user_id;
            }
            
            const [result] = await db.execute(`
                UPDATE team_members 
                SET is_active = 0, left_at = NOW()
                WHERE team_id = ? AND employee_id = ? AND tenant_id = ? AND is_active = 1
            `, [teamId, userId, tenant_id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Member not found' });
            }
            
            res.json({ success: true, message: 'Member removed successfully' });
        } catch (error) {
            console.error('Remove team member error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get teams by employee
    getTeamsByEmployee: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const { employeeId } = req.params;
            
            // Map employee_detail_id (string) to user_id
            let userId = employeeId;
            const [userMapping] = await db.execute(`
                SELECT user_id FROM employee_details 
                WHERE id = ? AND tenant_id = ?
            `, [String(employeeId), tenant_id]);
            
            if (userMapping.length > 0) {
                userId = userMapping[0].user_id;
            }
            
            const [teams] = await db.execute(`
                SELECT 
                    t.id,
                    t.name,
                    t.project_id,
                    p.name as project_name,
                    tm.role_in_team,
                    tm.joined_at,
                    CONCAT(u.first_name, ' ', u.last_name) as team_lead_name
                FROM teams t
                INNER JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = 1
                LEFT JOIN projects p ON t.project_id = p.id AND p.tenant_id = ?
                LEFT JOIN users u ON t.team_lead_id = u.id
                WHERE tm.employee_id = ? 
                    AND tm.is_active = 1 
                    AND tm.tenant_id = ?
                    AND t.tenant_id = ?
                    AND t.status = 'Active'
                ORDER BY t.name ASC
            `, [tenant_id, userId, tenant_id, tenant_id]);
            
            res.json({ success: true, data: teams });
        } catch (error) {
            console.error('Get teams by employee error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get current user's teams
    getMyTeams: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const [employees] = await db.execute(
                'SELECT id FROM employee_details WHERE user_id = ? AND tenant_id = ?',
                [req.user.id, tenant_id]
            );

            if (employees.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            const employeeId = employees[0].id;

            const [teams] = await db.execute(`
                SELECT 
                    t.id,
                    t.name,
                    t.project_id,
                    p.name as project_name,
                    tm.role_in_team,
                    tm.joined_at,
                    CONCAT(u.first_name, ' ', u.last_name) as team_lead_name
                FROM teams t
                INNER JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = 1
                LEFT JOIN projects p ON t.project_id = p.id AND p.tenant_id = ?
                LEFT JOIN users u ON t.team_lead_id = u.id
                WHERE tm.employee_id = ?
                    AND tm.is_active = 1
                    AND tm.tenant_id = ?
                    AND t.tenant_id = ?
                    AND t.status = 'Active'
                ORDER BY t.name ASC
            `, [tenant_id, employeeId, tenant_id, tenant_id]);

            res.json({ success: true, data: teams });
        } catch (error) {
            console.error('Get my teams error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Update team
    updateTeam: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const { id } = req.params;
            const { name, project_id, team_lead_id, description, status } = req.body;
            
            const [existingTeam] = await db.execute(
                'SELECT id FROM teams WHERE id = ? AND tenant_id = ?',
                [id, tenant_id]
            );
            
            if (existingTeam.length === 0) {
                return res.status(404).json({ success: false, message: 'Team not found' });
            }
            
            const updates = [];
            const values = [];
            
            if (name !== undefined) { updates.push('name = ?'); values.push(name); }
            if (project_id !== undefined) { updates.push('project_id = ?'); values.push(project_id); }
            if (team_lead_id !== undefined) { updates.push('team_lead_id = ?'); values.push(team_lead_id); }
            if (description !== undefined) { updates.push('description = ?'); values.push(description); }
            if (status !== undefined) { updates.push('status = ?'); values.push(status); }
            
            if (updates.length === 0) {
                return res.status(400).json({ success: false, message: 'No fields to update' });
            }
            
            updates.push('updated_at = NOW()');
            values.push(id, tenant_id);
            
            await db.execute(`UPDATE teams SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
            
            const [updatedTeam] = await db.execute(`
                SELECT t.id, t.name, t.project_id, p.name as project_name, t.team_lead_id,
                       CONCAT(u.first_name, ' ', u.last_name) as team_lead_name,
                       t.description, t.status, t.created_at
                FROM teams t
                LEFT JOIN projects p ON t.project_id = p.id AND p.tenant_id = ?
                LEFT JOIN users u ON t.team_lead_id = u.id
                WHERE t.id = ? AND t.tenant_id = ?
            `, [tenant_id, id, tenant_id]);
            
            res.json({ success: true, data: updatedTeam[0], message: 'Team updated successfully' });
        } catch (error) {
            console.error('Update team error:', error);
            res.status(500).json({ success: false, message: 'Failed to update team: ' + error.message });
        }
    },
 // Delete team (soft delete)
    deleteTeam: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId || 1;
            const { id } = req.params;
            
            console.log(`Soft deleting team ${id} for tenant ${tenant_id}`);
            
            const [result] = await db.execute(`
                UPDATE teams 
                SET status = 'Inactive', 
                    updated_at = NOW()
                WHERE id = ? AND tenant_id = ?
            `, [id, tenant_id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Team not found' });
            }
            
            res.json({ success: true, message: 'Team deleted successfully' });
        } catch (error) {
            console.error('Delete team error:', error);
            res.status(500).json({ success: false, message: 'Failed to delete team: ' + error.message });
        }
    }

};

module.exports = teamController;
