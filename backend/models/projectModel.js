const pool = require('../config/database');

const Project = {
  // Get all projects with phases (exclude template project)
  getAll: async (tenantId) => {
    const [projects] = await pool.execute(`
      SELECT 
        id, name, description, department, manager, 
        DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') as end_date,
        current_phase, status, progress, created_at, updated_at
      FROM projects 
      WHERE id != 1 AND tenant_id = ?
      ORDER BY created_at DESC
    `, [tenantId]);

    for (let project of projects) {
      const [phases] = await pool.execute(`
        SELECT * FROM project_phases 
        WHERE project_id = ? AND tenant_id = ?
        ORDER BY phase_order
      `, [project.id, tenantId]);
      
      // Parse documents for each phase
      project.phases = phases.map(phase => ({
        ...phase,
        documents: parseDocuments(phase.documents)
      }));

      // Get team members for each project
      project.team = await Project.getTeamMembers(tenantId, project.id);
    }

    return projects;
  },

  // Get projects assigned to the current user through team membership or manager ownership
  getByUser: async (tenantId, userId, fullName) => {
    const [projects] = await pool.execute(
      `SELECT DISTINCT
        p.id, p.name, p.description, p.department, p.manager,
        DATE_FORMAT(p.start_date, '%Y-%m-%d') as start_date,
        DATE_FORMAT(p.end_date, '%Y-%m-%d') as end_date,
        p.current_phase, p.status, p.progress, p.created_at, p.updated_at
      FROM projects p
      LEFT JOIN teams t
        ON t.project_id = p.id AND t.tenant_id = p.tenant_id
      LEFT JOIN team_members tm
        ON tm.team_id = t.id AND tm.tenant_id = p.tenant_id AND tm.is_active = 1
      LEFT JOIN employee_details ed
        ON ed.id = tm.employee_id AND ed.tenant_id = p.tenant_id
      WHERE p.id != 1
        AND p.tenant_id = ?
        AND (
          LOWER(TRIM(COALESCE(p.manager, ''))) = LOWER(TRIM(?))
          OR ed.user_id = ?
        )
      ORDER BY p.created_at DESC`,
      [tenantId, fullName || '', userId]
    );

    for (const project of projects) {
      const [phases] = await pool.execute(
        `SELECT * FROM project_phases
         WHERE project_id = ? AND tenant_id = ?
         ORDER BY phase_order`,
        [project.id, tenantId]
      );

      project.phases = phases.map((phase) => ({
        ...phase,
        documents: parseDocuments(phase.documents)
      }));

      project.team = await Project.getTeamMembers(tenantId, project.id);
    }

    return projects;
  },

  // Get project by ID with phases
  getById: async (tenantId, id) => {
    const [projects] = await pool.execute(`
      SELECT 
        id, name, description, department, manager, 
        DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') as end_date,
        current_phase, status, progress, created_at, updated_at
      FROM projects WHERE id = ? AND tenant_id = ?
    `, [id, tenantId]);

    if (projects.length === 0) return null;

    const project = projects[0];
    
    // Get phases for this project
    const [phases] = await pool.execute(`
      SELECT * FROM project_phases 
      WHERE project_id = ? AND tenant_id = ?
      ORDER BY phase_order
    `, [id, tenantId]);
    
    // Parse documents for each phase
    project.phases = phases.map(phase => ({
      ...phase,
      documents: parseDocuments(phase.documents)
    }));
    
    // Get team members for this project
    project.team = await Project.getTeamMembers(tenantId, id);
    
    return project;
  },

  // Create new project with phases
  create: async (tenantId, projectData) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        name, department, manager, start_date, end_date, 
        current_phase, status, description = ''
      } = projectData;

      // Insert project
      const [projectResult] = await connection.execute(
        `INSERT INTO projects (tenant_id, name, description, department, manager, start_date, end_date, current_phase, status, progress) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, name, description, department, manager, start_date, end_date, current_phase, status, 0]
      );

      const projectId = projectResult.insertId;

      // Check if template project exists and get its phases
      const [templatePhases] = await connection.execute(
        'SELECT name, phase_order FROM project_phases WHERE project_id = 1 AND tenant_id = ? ORDER BY phase_order',
        [tenantId]
      );
      
      // If template doesn't exist, use default phases
      let phasesToCreate = [];
      if (templatePhases.length > 0) {
        phasesToCreate = templatePhases;
      } else {
        // Default phases if template doesn't exist
        phasesToCreate = [
          { name: 'Planning', phase_order: 1 },
          { name: 'Design', phase_order: 2 },
          { name: 'Development', phase_order: 3 },
          { name: 'Testing', phase_order: 4 },
          { name: 'Deployment', phase_order: 5 }
        ];
      }
      
      // Insert phases
      if (phasesToCreate.length > 0) {
        const phaseValues = phasesToCreate.map(phase => [
          tenantId, projectId, phase.name, 'Not Started', 0, '', '[]', phase.phase_order
        ]);

        await connection.query(
          `INSERT INTO project_phases (tenant_id, project_id, name, status, progress, comments, documents, phase_order) 
           VALUES ?`,
          [phaseValues]
        );
      }

      await connection.commit();
      
      // Return the created project with formatted dates
      const [createdProject] = await connection.execute(`
        SELECT 
          id, name, description, department, manager, 
          DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
          DATE_FORMAT(end_date, '%Y-%m-%d') as end_date,
          current_phase, status, progress, created_at, updated_at
        FROM projects WHERE id = ? AND tenant_id = ?
      `, [projectId, tenantId]);
      
      const project = createdProject[0];
      
      // Get phases for this project
      const [phases] = await connection.execute(`
        SELECT * FROM project_phases 
        WHERE project_id = ? AND tenant_id = ?
        ORDER BY phase_order
      `, [projectId, tenantId]);
      
      // Parse documents for each phase
      project.phases = phases.map(phase => ({
        ...phase,
        documents: parseDocuments(phase.documents)
      }));

      // Get team members
      project.team = await Project.getTeamMembers(tenantId, projectId);
      
      return project;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Update project
  update: async (tenantId, id, projectData) => {
    const {
      name, department, manager, start_date, end_date, 
      current_phase, status, description = ''
    } = projectData;

    const [result] = await pool.execute(
      `UPDATE projects 
       SET name = ?, description = ?, department = ?, manager = ?, start_date = ?, 
           end_date = ?, current_phase = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND tenant_id = ?`,
      [name, description, department, manager, start_date, end_date, current_phase, status, id, tenantId]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    // Return the updated project with formatted dates
    const [updatedProjects] = await pool.execute(`
      SELECT 
        id, name, description, department, manager, 
        DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') as end_date,
        current_phase, status, progress, created_at, updated_at
      FROM projects WHERE id = ? AND tenant_id = ?
    `, [id, tenantId]);
    
    if (updatedProjects.length === 0) return null;
    
    const project = updatedProjects[0];
    
    // Get phases for this project
    const [phases] = await pool.execute(`
      SELECT * FROM project_phases 
      WHERE project_id = ? AND tenant_id = ?
      ORDER BY phase_order
    `, [id, tenantId]);
    
    // Parse documents for each phase
    project.phases = phases.map(phase => ({
      ...phase,
      documents: parseDocuments(phase.documents)
    }));

    // Get team members
    project.team = await Project.getTeamMembers(tenantId, id);
    
    return project;
  },

  // projectModel.js - Updated delete method
delete: async (tenantId, id) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log(`Starting deletion of project ${id} for tenant ${tenantId}`);

    // List of possible tables that might reference projects
    // Delete in order of dependency (child tables first)
    
    const tablesToCheck = [
      'project_phases',
      'team_members', 
      'project_history',
      'tasks',
      'project_documents',
      'project_comments',
      'project_attachments',
      'project_milestones',
      'project_budget',
      'project_risks',
      'project_changes'
    ];
    
    // Try to delete from each table if it exists
    for (const table of tablesToCheck) {
      try {
        // Check if table exists first
        const [tableExists] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = ?
        `, [table]);
        
        if (tableExists[0].count > 0) {
          // Check if column exists in the table
          const [columnExists] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND table_name = ? 
            AND column_name IN ('project_id', 'projectId')
          `, [table]);
          
          if (columnExists[0].count > 0) {
            // Try both possible column names
            try {
              const [result] = await connection.execute(
                `DELETE FROM ${table} WHERE (project_id = ? OR projectId = ?) AND tenant_id = ?`,
                [id, id, tenantId]
              );
              if (result.affectedRows > 0) {
                console.log(`Deleted ${result.affectedRows} records from ${table}`);
              }
            } catch (err) {
              console.log(`Could not delete from ${table}:`, err.message);
            }
          }
        }
      } catch (err) {
        console.log(`Error processing table ${table}:`, err.message);
      }
    }
    
    // Also try to delete from generic tables that might reference projects
    try {
      // Delete from any table that has project_id column (dynamic approach)
      const [allTables] = await connection.execute(`
        SELECT DISTINCT TABLE_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND COLUMN_NAME IN ('project_id', 'projectId')
        AND TABLE_NAME != 'projects'
      `);
      
      for (const tableRow of allTables) {
        const tableName = tableRow.TABLE_NAME;
        try {
          const [result] = await connection.execute(
            `DELETE FROM ${tableName} WHERE (project_id = ? OR projectId = ?) AND tenant_id = ?`,
            [id, id, tenantId]
          );
          if (result.affectedRows > 0) {
            console.log(`Deleted ${result.affectedRows} records from ${tableName}`);
          }
        } catch (err) {
          console.log(`Could not delete from ${tableName}:`, err.message);
        }
      }
    } catch (err) {
      console.log('Error finding related tables:', err.message);
    }
    
    // Finally delete the project itself
    const [result] = await connection.execute(
      'DELETE FROM projects WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    
    console.log(`Project deletion affected ${result.affectedRows} rows`);
    
    await connection.commit();
    console.log('Transaction committed successfully');
    
    return result.affectedRows;
    
  } catch (error) {
    await connection.rollback();
    console.error('Error in Project.delete:', error);
    throw error;
  } finally {
    connection.release();
  }
},
  // Update project phase
  updatePhase: async (tenantId, projectId, phaseName, phaseData) => {
    const { status, progress, comments } = phaseData;

    const [result] = await pool.execute(
      `UPDATE project_phases 
       SET status = ?, progress = ?, comments = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE project_id = ? AND name = ? AND tenant_id = ?`,
      [status, progress, comments, projectId, phaseName, tenantId]
    );

    if (result.affectedRows > 0) {
      // Update project progress
      const [phases] = await pool.execute(
        'SELECT progress FROM project_phases WHERE project_id = ? AND tenant_id = ?',
        [projectId, tenantId]
      );

      const avgProgress = phases.length > 0 
        ? Math.round(phases.reduce((sum, phase) => sum + phase.progress, 0) / phases.length)
        : 0;

      await pool.execute(
        'UPDATE projects SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?',
        [avgProgress, projectId, tenantId]
      );
    }

    return await Project.getById(tenantId, projectId);
  },

  // Get dashboard statistics (exclude template project)
  getDashboardStats: async (tenantId) => {
    const [rows] = await pool.execute(`
      SELECT 
        COUNT(*) as totalProjects,
        COUNT(CASE WHEN status != 'Completed' THEN 1 END) as activeProjects,
        COUNT(CASE WHEN status = 'Delayed' THEN 1 END) as delayedProjects,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completedProjects
      FROM projects
      WHERE id != 1 AND tenant_id = ?
    `, [tenantId]);
    
    return rows[0];
  },

  // Get managers list
  getManagers: async (tenantId) => {
    const [rows] = await pool.execute(`
      SELECT DISTINCT manager as name 
      FROM departments 
      WHERE manager IS NOT NULL AND manager != '' AND tenant_id = ?
      UNION
      SELECT DISTINCT CONCAT(u.first_name, ' ', u.last_name) as name
      FROM employee_details ed
      INNER JOIN users u ON ed.user_id = u.id
      WHERE (ed.position LIKE '%manager%' OR 
             ed.position LIKE '%lead%' OR 
             ed.position LIKE '%head%' OR 
             ed.position LIKE '%director%')
      AND u.is_active = 1 AND u.tenant_id = ? AND ed.tenant_id = ?
      ORDER BY name
    `, [tenantId, tenantId, tenantId]);
    return rows;
  },

  // Get departments list
  getDepartments: async (tenantId) => {
    const [rows] = await pool.execute(`
      SELECT DISTINCT name 
      FROM departments 
      WHERE name IS NOT NULL AND name != '' AND tenant_id = ?
      ORDER BY name
    `, [tenantId]);
    return rows.map(row => row.name);
  },

  // Check if project name already exists
  checkNameExists: async (tenantId, name, excludeId = null) => {
    let query = 'SELECT id FROM projects WHERE name = ? AND id != 1 AND tenant_id = ?';
    const params = [name, tenantId];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.execute(query, params);
    return rows.length > 0;
  },

  // Get project team members (via teams table which links projects to team_members)
  getTeamMembers: async (tenantId, projectId) => {
    try {
      const [rows] = await pool.execute(
        `SELECT 
          tm.employee_id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          d.name as department,
          ed.position
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id AND tm.tenant_id = ?
        JOIN employee_details ed ON tm.employee_id = ed.id
        JOIN users u ON ed.user_id = u.id
        LEFT JOIN departments d ON ed.department_id = d.id
        WHERE t.project_id = ? AND t.tenant_id = ? AND tm.is_active = 1`,
        [tenantId, projectId, tenantId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getTeamMembers:', error);
      return [];
    }
  },

  // Assign team to project
  assignTeam: async (tenantId, projectId, teamData) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Update project with assigned department and manager
      await connection.execute(
        `UPDATE projects SET
          department = ?,
          manager = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?`,
        [
          teamData.assigned_department,
          teamData.manager_name,
          projectId,
          tenantId
        ]
      );

      // Find or create a team linked to this project
      let [existingTeams] = await connection.execute(
        'SELECT id FROM teams WHERE project_id = ? AND tenant_id = ?',
        [projectId, tenantId]
      );

      let teamId;
      if (existingTeams.length > 0) {
        teamId = existingTeams[0].id;
        // Remove existing team members
        await connection.execute(
          'DELETE FROM team_members WHERE team_id = ? AND tenant_id = ?',
          [teamId, tenantId]
        );
      } else {
        // Create a team for this project
        const [projectRows] = await connection.execute(
          'SELECT name FROM projects WHERE id = ? AND tenant_id = ?',
          [projectId, tenantId]
        );
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'Project';
        const [teamResult] = await connection.execute(
          `INSERT INTO teams (tenant_id, project_id, name, status, created_at) 
           VALUES (?, ?, ?, 'Active', NOW())`,
          [tenantId, projectId, `${projectName} Team`]
        );
        teamId = teamResult.insertId;
      }

      // Add new team members
      if (teamData.team && teamData.team.length > 0) {
        const teamValues = teamData.team.map(employeeId => [tenantId, teamId, employeeId]);
        await connection.query(
          'INSERT INTO team_members (tenant_id, team_id, employee_id) VALUES ?',
          [teamValues]
        );
      }

      // Add to project history
      await connection.execute(
        `INSERT INTO project_history (tenant_id, project_id, date, action, user)
         VALUES (?, ?, CURDATE(), 'Team assigned to project', 'Admin')`,
        [tenantId, projectId]
      );

      await connection.commit();
      
      // Return the updated project with team
      const project = await Project.getById(tenantId, projectId);
      project.team = await Project.getTeamMembers(tenantId, projectId);
      return project;
    } catch (error) {
      await connection.rollback();
      console.error('Error in assignTeam:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  // Get employees for dropdown
  getEmployeesForDropdown: async (tenantId) => {
    try {
      const [rows] = await pool.execute(
        `SELECT 
          ed.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          d.name as department,
          ed.position
        FROM employee_details ed
        JOIN users u ON ed.user_id = u.id
        LEFT JOIN departments d ON ed.department_id = d.id
        WHERE u.is_active = TRUE AND ed.status = 'active' AND ed.tenant_id = ? AND u.tenant_id = ?
        ORDER BY u.first_name, u.last_name`,
        [tenantId, tenantId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getEmployeesForDropdown:', error);
      throw error;
    }
  },

  // Initialize template project (run this once)
  initializeTemplate: async (tenantId) => {
    try {
      // Check if template already exists
      const [existing] = await pool.execute('SELECT id FROM projects WHERE id = 1 AND tenant_id = ?', [tenantId]);
      
      if (existing.length === 0) {
        await pool.execute(`
          INSERT INTO projects (id, tenant_id, name, description, department, manager, start_date, end_date, current_phase, status, progress) 
          VALUES (1, ?, 'Project Template', 'Template project with standard phases', 'IT', 'Template Manager', '2024-01-01', '2024-12-31', 'Planning', 'Template', 0)
        `, [tenantId]);
        
        await pool.execute(`
          INSERT INTO project_phases (project_id, tenant_id, name, status, progress, comments, phase_order) VALUES
          (1, ?, 'Planning', 'Not Started', 0, 'Project planning and requirements gathering', 1),
          (1, ?, 'Design', 'Not Started', 0, 'System design and architecture', 2),
          (1, ?, 'Development', 'Not Started', 0, 'Implementation and coding', 3),
          (1, ?, 'Testing', 'Not Started', 0, 'Quality assurance and testing', 4),
          (1, ?, 'Deployment', 'Not Started', 0, 'Production deployment', 5)
        `, [tenantId, tenantId, tenantId, tenantId, tenantId]);
        
        console.log('Template project initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing template:', error);
    }
  }
};

// Helper function to parse documents
const parseDocuments = (documents) => {
  if (!documents) return [];
  if (typeof documents === 'string') {
    try {
      return JSON.parse(documents);
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(documents) ? documents : [];
};

module.exports = Project;
