// models/teamModel.js
const pool = require('../config/database');

const Team = {
  // Get all teams with member count and team lead details
  getAll: async (tenantId, filters = {}) => {
    let query = `
      SELECT 
        t.*,
        tl.name as team_lead_name,
        tl.email as team_lead_email,
        COUNT(DISTINCT tm.employee_id) as member_count,
        GROUP_CONCAT(DISTINCT tm.employee_id) as member_ids
      FROM teams t
      LEFT JOIN employee_details tl ON t.team_lead_id = tl.id
      LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = 1
      WHERE t.tenant_id = ?
    `;
    const params = [tenantId];
    
    if (filters.status) {
      query += ' AND t.status = ?';
      params.push(filters.status);
    }
    if (filters.department_id) {
      query += ' AND t.department_id = ?';
      params.push(filters.department_id);
    }
    
    query += ' GROUP BY t.id ORDER BY t.name ASC';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Get team by ID with full member details
  getById: async (tenantId, id) => {
    // Get team details
    const [teams] = await pool.execute(`
      SELECT 
        t.*,
        d.name as department_name,
        tl.id as team_lead_id,
        tl.name as team_lead_name,
        tl.email as team_lead_email,
        tl.position as team_lead_position
      FROM teams t
      LEFT JOIN departments d ON t.department_id = d.id AND d.tenant_id = ?
      LEFT JOIN employee_details tl ON t.team_lead_id = tl.id
      WHERE t.id = ? AND t.tenant_id = ?
    `, [tenantId, id, tenantId]);
    
    if (teams.length === 0) return null;
    
    const team = teams[0];
    
    // Get team members with full details
    const [members] = await pool.execute(`
      SELECT 
        tm.id as member_id,
        tm.employee_id,
        tm.role_in_team,
        tm.joined_at,
        e.name,
        e.email,
        e.position,
        e.department,
        d.name as department_name
      FROM team_members tm
      JOIN employee_details e ON tm.employee_id = e.id AND e.tenant_id = ?
      LEFT JOIN departments d ON e.department_id = d.id AND d.tenant_id = ?
      WHERE tm.team_id = ? 
        AND tm.is_active = 1 
        AND tm.tenant_id = ?
      ORDER BY e.name ASC
    `, [tenantId, tenantId, id, tenantId]);
    
    team.members = members;
    team.member_count = members.length;
    
    return team;
  },

 // In teamModel.js create method
create: async (tenantId, teamData) => {
  const { name, project_id, team_lead_id, description, status } = teamData; // Add project_id
  
  const [result] = await pool.execute(`
    INSERT INTO teams (
      tenant_id, 
      name, 
      project_id,  // Add this field
      team_lead_id, 
      description, 
      status,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
  `, [
    tenantId, 
    name, 
    project_id || null,  // Add this
    team_lead_id || null, 
    description || null, 
    status || 'Active'
  ]);
  
  return result.insertId;
},
  // Update team
  update: async (tenantId, id, teamData) => {
    const fields = [];
    const values = [];
    
    if (teamData.name !== undefined) {
      fields.push('name = ?');
      values.push(teamData.name);
    }
    if (teamData.department_id !== undefined) {
      fields.push('department_id = ?');
      values.push(teamData.department_id);
    }
    if (teamData.team_lead_id !== undefined) {
      fields.push('team_lead_id = ?');
      values.push(teamData.team_lead_id);
    }
    if (teamData.description !== undefined) {
      fields.push('description = ?');
      values.push(teamData.description);
    }
    if (teamData.status !== undefined) {
      fields.push('status = ?');
      values.push(teamData.status);
    }
    
    if (fields.length === 0) return true;
    
    fields.push('updated_at = NOW()');
    values.push(id, tenantId);
    
    const query = `UPDATE teams SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`;
    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  },

  // Add member to team
  addMember: async (tenantId, teamId, employeeId, roleInTeam = null) => {
    // Check if member already exists
    const [existing] = await pool.execute(`
      SELECT id FROM team_members 
      WHERE team_id = ? AND employee_id = ? AND tenant_id = ?
    `, [teamId, employeeId, tenantId]);
    
    if (existing.length > 0) {
      // Reactivate existing member
      const [result] = await pool.execute(`
        UPDATE team_members SET 
          is_active = 1, 
          left_at = NULL,
          role_in_team = COALESCE(?, role_in_team),
          updated_at = NOW()
        WHERE team_id = ? AND employee_id = ? AND tenant_id = ?
      `, [roleInTeam, teamId, employeeId, tenantId]);
      return result.affectedRows > 0;
    } else {
      // Add new member
      const [result] = await pool.execute(`
        INSERT INTO team_members (
          tenant_id, 
          team_id, 
          employee_id, 
          role_in_team,
          joined_at
        ) VALUES (?, ?, ?, ?, NOW())
      `, [tenantId, teamId, employeeId, roleInTeam]);
      return result.affectedRows > 0;
    }
  },

  // Remove member from team
  removeMember: async (tenantId, teamId, employeeId) => {
    const [result] = await pool.execute(`
      UPDATE team_members SET 
        is_active = 0, 
        left_at = NOW(),
        updated_at = NOW()
      WHERE team_id = ? AND employee_id = ? AND tenant_id = ?
    `, [teamId, employeeId, tenantId]);
    return result.affectedRows > 0;
  },

  // Get team members with details
  getMembers: async (tenantId, teamId) => {
    const [rows] = await pool.execute(`
      SELECT 
        e.id as employee_id,
        e.name,
        e.email,
        e.position,
        e.department,
        tm.role_in_team,
        tm.joined_at,
        d.name as department_name
      FROM team_members tm
      JOIN employee_details e ON tm.employee_id = e.id AND e.tenant_id = ?
      LEFT JOIN departments d ON e.department_id = d.id AND d.tenant_id = ?
      WHERE tm.team_id = ? 
        AND tm.is_active = 1 
        AND tm.tenant_id = ?
      ORDER BY e.name ASC
    `, [tenantId, tenantId, teamId, tenantId]);
    return rows;
  },

  // Get teams by employee
  getTeamsByEmployee: async (tenantId, employeeId) => {
    const [rows] = await pool.execute(`
      SELECT 
        t.*,
        tm.role_in_team,
        tm.joined_at,
        tl.name as team_lead_name
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN employee_details tl ON t.team_lead_id = tl.id
      WHERE tm.employee_id = ? 
        AND tm.is_active = 1 
        AND tm.tenant_id = ?
        AND t.tenant_id = ?
      ORDER BY t.name ASC
    `, [employeeId, tenantId, tenantId]);
    return rows;
  },

  // Delete team (soft delete - set inactive)
  delete: async (tenantId, id) => {
    const [result] = await pool.execute(`
      UPDATE teams SET 
        status = 'Inactive',
        updated_at = NOW()
      WHERE id = ? AND tenant_id = ?
    `, [id, tenantId]);
    return result.affectedRows > 0;
  },

  // Hard delete team (use with caution)
  hardDelete: async (tenantId, id) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Delete team members first
      await connection.execute('DELETE FROM team_members WHERE team_id = ? AND tenant_id = ?', [id, tenantId]);
      // Delete team
      const [result] = await connection.execute('DELETE FROM teams WHERE id = ? AND tenant_id = ?', [id, tenantId]);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Get all available employees (excluding those already in team)
  getAvailableEmployees: async (tenantId, teamId = null) => {
    let query = `
      SELECT 
        ed.id as employee_id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        u.email,
        COALESCE(ed.position, 'Employee') as position,
        COALESCE(d.name, 'No Department') as department,
        COALESCE(r.name, 'employee') as role_name
      FROM employee_details ed
      INNER JOIN users u ON ed.user_id = u.id
      LEFT JOIN departments d ON ed.department_id = d.id AND d.tenant_id = ?
      INNER JOIN roles r ON u.role_id = r.id
      WHERE u.is_active = 1 
        AND u.tenant_id = ?
        AND r.name NOT IN ('hr', 'admin')
    `;
    const params = [tenantId, tenantId];
    
    if (teamId) {
      query += ` AND ed.id NOT IN (
        SELECT employee_id FROM team_members 
        WHERE team_id = ? AND is_active = 1 AND tenant_id = ?
      )`;
      params.push(teamId, tenantId);
    }
    
    query += ' ORDER BY u.first_name, u.last_name';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Get team leads (employees who can be team leads)
  getTeamLeads: async (tenantId) => {
    const [rows] = await pool.execute(`
      SELECT 
        ed.id as employee_id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        u.email,
        ed.position,
        COALESCE(d.name, 'No Department') as department
      FROM employee_details ed
      INNER JOIN users u ON ed.user_id = u.id
      LEFT JOIN departments d ON ed.department_id = d.id AND d.tenant_id = ?
      WHERE u.is_active = 1 
        AND u.tenant_id = ?
        AND (ed.position LIKE '%lead%' 
          OR ed.position LIKE '%manager%' 
          OR ed.position LIKE '%head%'
          OR ed.role_name LIKE '%lead%')
      ORDER BY u.first_name, u.last_name
    `, [tenantId, tenantId]);
    return rows;
  }
};

module.exports = Team;