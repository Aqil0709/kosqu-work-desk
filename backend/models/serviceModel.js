// backend/models/serviceModel.js
const pool = require('../config/database');

class Service {
  // Get all services with related data
  static async getAll(tenantId, filters = {}) {
    try {
      let query = `
        SELECT 
          s.id,
          s.service_name,
          st.name as service_type,
          s.description,
          d.name as assigned_department,
          ss.name as status,
          s.service_manager_id,
          IFNULL(CONCAT(u.first_name, ' ', u.last_name), 'Not Assigned') as service_manager,
          s.scheduled_date,
          s.scheduled_time,
          s.progress,
          s.created_at,
          s.updated_at
        FROM services s
        LEFT JOIN service_types st ON s.service_type_id = st.id
        LEFT JOIN departments d ON s.assigned_department_id = d.id
        LEFT JOIN service_status ss ON s.status_id = ss.id
        LEFT JOIN employee_details ed ON s.service_manager_id = ed.id
        LEFT JOIN users u ON ed.user_id = u.id
        WHERE s.tenant_id = ?
      `;

      const conditions = [];
      const params = [tenantId];

      // Apply filters
      if (filters.service_type) {
        conditions.push('st.name = ?');
        params.push(filters.service_type);
      }

      if (filters.status) {
        conditions.push('ss.name = ?');
        params.push(filters.status);
      }

      if (filters.assigned_department) {
        conditions.push('d.name = ?');
        params.push(filters.assigned_department);
      }

      if (filters.search) {
        conditions.push('s.service_name LIKE ?');
        params.push(`%${filters.search}%`);
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      query += ' ORDER BY s.created_at DESC';

      const [rows] = await pool.execute(query, params);
      
      // Format the results to match frontend structure
      const formattedServices = await Promise.all(
        rows.map(async (service) => {
          const history = await this.getServiceHistory(tenantId, service.id);
          const teamMembers = await this.getServiceTeamMembers(tenantId, service.id);
          
          return {
            id: service.id,
            service_name: service.service_name,
            service_type: service.service_type,
            description: service.description,
            assigned_department: service.assigned_department,
            status: service.status,
            service_manager: service.service_manager,
            scheduled_date: service.scheduled_date,
            scheduled_time: service.scheduled_time?.substring(0, 5),
            progress: service.progress,
            team: teamMembers,
            history: history
          };
        })
      );
      
      return formattedServices;
    } catch (error) {
      console.error('Error in Service.getAll:', error);
      throw error;
    }
  }

  // Get service by ID
  static async getById(tenantId, id) {
    try {
      const query = `
        SELECT 
          s.id,
          s.service_name,
          st.name as service_type,
          s.description,
          d.name as assigned_department,
          ss.name as status,
          s.service_manager_id,
          IFNULL(CONCAT(u.first_name, ' ', u.last_name), 'Not Assigned') as service_manager,
          s.scheduled_date,
          s.scheduled_time,
          s.progress,
          s.created_at,
          s.updated_at
        FROM services s
        LEFT JOIN service_types st ON s.service_type_id = st.id
        LEFT JOIN departments d ON s.assigned_department_id = d.id
        LEFT JOIN service_status ss ON s.status_id = ss.id
        LEFT JOIN employee_details ed ON s.service_manager_id = ed.id
        LEFT JOIN users u ON ed.user_id = u.id
        WHERE s.id = ? AND s.tenant_id = ?
      `;

      const [rows] = await pool.execute(query, [id, tenantId]);
      
      if (rows.length === 0) {
        return null;
      }

      const service = rows[0];
      const history = await this.getServiceHistory(tenantId, id);
      const teamMembers = await this.getServiceTeamMembers(tenantId, id);

      return {
        id: service.id,
        service_name: service.service_name,
        service_type: service.service_type,
        description: service.description,
        assigned_department: service.assigned_department,
        status: service.status,
        service_manager: service.service_manager,
        scheduled_date: service.scheduled_date,
        scheduled_time: service.scheduled_time?.substring(0, 5),
        progress: service.progress,
        team: teamMembers,
        history: history
      };
    } catch (error) {
      console.error('Error in Service.getById:', error);
      throw error;
    }
  }

  // Get service history
  static async getServiceHistory(tenantId, serviceId) {
    try {
      const query = `
        SELECT date, action, user 
        FROM service_history 
        WHERE service_id = ? 
        ORDER BY date DESC, created_at DESC
      `;
      
      // Implicitly scoped since service is already tenant isolated
      const [rows] = await pool.execute(query, [serviceId]);
      return rows;
    } catch (error) {
      console.error('Error in getServiceHistory:', error);
      throw error;
    }
  }

  // Get service team members
  static async getServiceTeamMembers(tenantId, serviceId) {
    try {
      const query = `
        SELECT 
          stm.employee_id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          d.name as department
        FROM service_team_members stm
        JOIN employee_details ed ON stm.employee_id = ed.id
        JOIN users u ON ed.user_id = u.id
        LEFT JOIN departments d ON ed.department_id = d.id
        WHERE stm.service_id = ? AND ed.tenant_id = ?
      `;
      
      const [rows] = await pool.execute(query, [serviceId, tenantId]);
      return rows;
    } catch (error) {
      console.error('Error in getServiceTeamMembers:', error);
      return [];
    }
  }

  // Create new service
  static async create(tenantId, serviceData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get IDs for related data
      const [serviceType] = await connection.execute(
        'SELECT id FROM service_types WHERE name = ? AND tenant_id = ?',
        [serviceData.service_type, tenantId]
      );
      
      const [department] = await connection.execute(
        'SELECT id FROM departments WHERE name = ? AND tenant_id = ?',
        [serviceData.assigned_department, tenantId]
      );
      
      // Assume service_status is a global or tenant-scoped table? Assuming global/tenant
      // We will look up either way
      let statusId = 1;
      const [statusRows] = await connection.execute(
        'SELECT id FROM service_status WHERE name = ?',
        [serviceData.status || 'Active']
      );
      if (statusRows.length > 0) statusId = statusRows[0].id;

      // Get employee ID from employee name
      let serviceManagerId = null;
      if (serviceData.service_manager && serviceData.service_manager !== 'Not Assigned') {
        const [manager] = await connection.execute(
          `SELECT ed.id 
           FROM employee_details ed 
           JOIN users u ON ed.user_id = u.id 
           WHERE CONCAT(u.first_name, ' ', u.last_name) = ? AND ed.tenant_id = ?`,
          [serviceData.service_manager, tenantId]
        );
        serviceManagerId = manager.length > 0 ? manager[0].id : null;
      }

      if (serviceType.length === 0) {
        throw new Error('Service type not found');
      }

      // Insert service
      const [result] = await connection.execute(
        `INSERT INTO services (
          tenant_id, service_name, service_type_id, description, assigned_department_id,
          status_id, service_manager_id, scheduled_date, scheduled_time, progress
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          serviceData.service_name,
          serviceType[0].id,
          serviceData.description || null,
          department.length > 0 ? department[0].id : null,
          statusId,
          serviceManagerId,
          serviceData.scheduled_date || null,
          serviceData.scheduled_time ? serviceData.scheduled_time + ':00' : null,
          serviceData.progress || 0
        ]
      );

      const serviceId = result.insertId;

      // Add initial history entry
      await connection.execute(
        `INSERT INTO service_history (service_id, date, action, user)
         VALUES (?, CURDATE(), 'Service created', 'Admin')`,
        [serviceId]
      );

      await connection.commit();
      
      // Return the created service
      return await this.getById(tenantId, serviceId);
    } catch (error) {
      await connection.rollback();
      console.error('Error in Service.create:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update service
  static async update(tenantId, id, serviceData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get IDs for related data
      const [serviceType] = await connection.execute(
        'SELECT id FROM service_types WHERE name = ? AND tenant_id = ?',
        [serviceData.service_type, tenantId]
      );
      
      const [department] = await connection.execute(
        'SELECT id FROM departments WHERE name = ? AND tenant_id = ?',
        [serviceData.assigned_department, tenantId]
      );
      
      let statusId = null;
      const [statusRows] = await connection.execute(
        'SELECT id FROM service_status WHERE name = ?',
        [serviceData.status]
      );
      if (statusRows.length > 0) statusId = statusRows[0].id;

      // Get employee ID from employee name
      let serviceManagerId = null;
      if (serviceData.service_manager && serviceData.service_manager !== 'Not Assigned') {
        const [manager] = await connection.execute(
          `SELECT ed.id 
           FROM employee_details ed 
           JOIN users u ON ed.user_id = u.id 
           WHERE CONCAT(u.first_name, ' ', u.last_name) = ? AND ed.tenant_id = ?`,
          [serviceData.service_manager, tenantId]
        );
        serviceManagerId = manager.length > 0 ? manager[0].id : null;
      }

      // Update service
      await connection.execute(
        `UPDATE services SET
          service_name = ?,
          service_type_id = ?,
          description = ?,
          assigned_department_id = ?,
          status_id = ?,
          service_manager_id = ?,
          scheduled_date = ?,
          scheduled_time = ?,
          progress = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?`,
        [
          serviceData.service_name,
          serviceType.length > 0 ? serviceType[0].id : null,
          serviceData.description || null,
          department.length > 0 ? department[0].id : null,
          statusId,
          serviceManagerId,
          serviceData.scheduled_date || null,
          serviceData.scheduled_time ? serviceData.scheduled_time + ':00' : null,
          serviceData.progress || 0,
          id,
          tenantId
        ]
      );

      // Add history entry
      await connection.execute(
        `INSERT INTO service_history (service_id, date, action, user)
         VALUES (?, CURDATE(), 'Service updated', 'Admin')`,
        [id]
      );

      await connection.commit();
      
      // Return the updated service
      return await this.getById(tenantId, id);
    } catch (error) {
      await connection.rollback();
      console.error('Error in Service.update:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Delete service
  static async delete(tenantId, id) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'DELETE FROM services WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
      );

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error('Error in Service.delete:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Assign team to service
  static async assignTeam(tenantId, serviceId, teamData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check service existence and tenant
      const [serviceCheck] = await connection.execute('SELECT id FROM services WHERE id = ? AND tenant_id = ?', [serviceId, tenantId]);
      if (serviceCheck.length === 0) throw new Error('Service not found');

      // Get department ID
      const [department] = await connection.execute(
        'SELECT id FROM departments WHERE name = ? AND tenant_id = ?',
        [teamData.assigned_department, tenantId]
      );

      // Get employee ID from employee name for service manager
      let serviceManagerId = null;
      if (teamData.service_manager && teamData.service_manager !== 'Not Assigned') {
        const [manager] = await connection.execute(
          `SELECT ed.id 
           FROM employee_details ed 
           JOIN users u ON ed.user_id = u.id 
           WHERE CONCAT(u.first_name, ' ', u.last_name) = ? AND ed.tenant_id = ?`,
          [teamData.service_manager, tenantId]
        );
        serviceManagerId = manager.length > 0 ? manager[0].id : null;
      }

      // Update service department and manager
      await connection.execute(
        `UPDATE services SET
          assigned_department_id = ?,
          service_manager_id = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?`,
        [
          department.length > 0 ? department[0].id : null,
          serviceManagerId,
          serviceId,
          tenantId
        ]
      );

      // Remove existing team members
      await connection.execute(
        'DELETE FROM service_team_members WHERE service_id = ?',
        [serviceId]
      );

      // Add new team members
      if (teamData.team && teamData.team.length > 0) {
        const teamValues = teamData.team.map(employeeId => [serviceId, employeeId]);
        const insertQuery = 'INSERT INTO service_team_members (service_id, employee_id) VALUES ?';
        
        // This query inserts multiple rows at once, using [teamValues] for bulk insert syntax in mysql2
        await connection.query(insertQuery, [teamValues]);
      }

      // Add history entry
      await connection.execute(
        `INSERT INTO service_history (service_id, date, action, user)
         VALUES (?, CURDATE(), 'Service assigned/updated', 'Admin')`,
        [serviceId]
      );

      await connection.commit();
      
      return await this.getById(tenantId, serviceId);
    } catch (error) {
      await connection.rollback();
      console.error('Error in Service.assignTeam:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get all service types
  static async getServiceTypes(tenantId) {
    try {
      const [rows] = await pool.execute('SELECT * FROM service_types WHERE tenant_id = ? ORDER BY name', [tenantId]);
      return rows;
    } catch (error) {
      console.error('Error in Service.getServiceTypes:', error);
      throw error;
    }
  }

  // Get all status types (globally shared table usually or tenant specific)
  // Assuming globally shared if no tenant check, but we'll try global
  static async getStatusTypes(tenantId) {
    try {
      const [rows] = await pool.execute('SELECT * FROM service_status ORDER BY name');
      return rows;
    } catch (error) {
      console.error('Error in Service.getStatusTypes:', error);
      throw error;
    }
  }

  // Get all employees for dropdown
  static async getEmployeesForDropdown(tenantId) {
    try {
      const [rows] = await pool.execute(
        `SELECT 
          ed.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          d.name as department
        FROM employee_details ed
        JOIN users u ON ed.user_id = u.id
        LEFT JOIN departments d ON ed.department_id = d.id
        WHERE u.is_active = TRUE AND ed.tenant_id = ?
        ORDER BY u.first_name, u.last_name`, [tenantId]
      );
      return rows;
    } catch (error) {
      console.error('Error in Service.getEmployeesForDropdown:', error);
      throw error;
    }
  }
}

module.exports = Service;