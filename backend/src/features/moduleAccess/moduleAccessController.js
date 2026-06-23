const sendResponse = require('../../utils/response');
const moduleAccessModel = require('./moduleAccessModel');

const moduleAccessController = {
  listUsers: async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenant_id;
      const users = await moduleAccessModel.listUsersWithAccess(tenantId);
      return sendResponse(res, 200, true, 'Users fetched', users);
    } catch (error) {
      console.error('listUsers error:', error);
      return sendResponse(res, 500, false, error.message, null);
    }
  },

  getUserAccess: async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenant_id;
      const userId = parseInt(req.params.userId, 10);
      const data = await moduleAccessModel.getUserModuleAccess(userId, tenantId);
      if (!data) {
        return sendResponse(res, 404, false, 'User not found', null);
      }
      return sendResponse(res, 200, true, 'User access fetched', data);
    } catch (error) {
      console.error('getUserAccess error:', error);
      return sendResponse(res, 500, false, error.message, null);
    }
  },

  updateUserAccess: async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenant_id;
      const userId = parseInt(req.params.userId, 10);
      const { modules } = req.body;

      if (!Array.isArray(modules)) {
        return sendResponse(res, 400, false, 'modules array is required', null);
      }

      const target = await moduleAccessModel.getUserModuleAccess(userId, tenantId);
      if (!target) {
        return sendResponse(res, 404, false, 'User not found', null);
      }

      if (target.is_admin) {
        return sendResponse(res, 400, false, 'Cannot modify module access for admin users', null);
      }

      await moduleAccessModel.setUserModuleAccess(
        userId,
        tenantId,
        modules,
        req.user.id,
        target.position
      );

      const updated = await moduleAccessModel.getUserModuleAccess(userId, tenantId);
      return sendResponse(res, 200, true, 'Module access updated', updated);
    } catch (error) {
      console.error('updateUserAccess error:', error);
      return sendResponse(res, 500, false, error.message, null);
    }
  },

  // Bulk-assign module permissions to all users of a given role/position
  assignRoleDefaults: async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenant_id;
      const { role, modules } = req.body;

      if (!role || !Array.isArray(modules)) {
        return sendResponse(res, 400, false, 'role and modules[] are required', null);
      }
      if (role === 'admin') {
        return sendResponse(res, 400, false, 'Cannot modify admin access', null);
      }

      const { pool } = require('../../config/db');
      // Get all users with this role/position in the tenant (excluding admins)
      const [users] = await pool.execute(
        `SELECT id FROM users WHERE tenant_id=? AND position=? AND is_active=1`,
        [tenantId, role]
      );

      let updated = 0;
      for (const u of users) {
        await moduleAccessModel.setUserModuleAccess(u.id, tenantId, modules, req.user.id, role);
        updated++;
      }

      return sendResponse(res, 200, true, `Updated ${updated} user(s) with role '${role}'`, { updated, role });
    } catch (error) {
      console.error('assignRoleDefaults error:', error);
      return sendResponse(res, 500, false, error.message, null);
    }
  },

  getMyModules: async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user.tenant_id;
      const isAdmin = req.user.position === 'admin';
      const modules = await moduleAccessModel.getModulesForUser(
        req.user.id,
        tenantId,
        isAdmin,
        req.user.position
      );
      return sendResponse(res, 200, true, 'Modules fetched', modules);
    } catch (error) {
      console.error('getMyModules error:', error);
      return sendResponse(res, 500, false, error.message, null);
    }
  },
};

module.exports = moduleAccessController;
