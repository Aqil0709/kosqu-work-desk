// backend/src/features/pttm/pttmController.js

const pttmModel = require('./pttmModel');

const DOC_PHASES = [
  { num: 1, phase: 'BRD', desc: 'Business Requirement Document', dep: 'Client Communication', resp: 'BDE / Tech Lead / Client' },
  { num: 2, phase: 'SRS', desc: 'Software Requirement Specification', dep: 'BRD', resp: 'BDE / Tech Lead' },
  { num: 3, phase: 'Wireframe', desc: 'Sketches & UI designs in Figma', dep: 'SRS', resp: 'UI/UX Designer' },
  { num: 4, phase: 'Client Approval', desc: 'Client sign-off to avoid endless changes', dep: 'Wireframe', resp: 'Client' },
  { num: 5, phase: 'System/UI/Flows', desc: 'Architecture diagrams & prototypes', dep: 'Client Approval', resp: 'Tech Lead' },
  { num: 6, phase: 'Development', desc: 'Coded modules delivered by sprint', dep: 'System/UI/Flows', resp: 'Developers / Tech Lead' },
  { num: 7, phase: 'Testing & Reports', desc: 'Bug & development gap reports', dep: 'Development', resp: 'QA Tester / Developers' },
  { num: 8, phase: 'Approval', desc: 'Final client & tech lead reviews', dep: 'Tests Passed', resp: 'Client / Tech Lead' },
  { num: 9, phase: 'User Manual', desc: 'PDF user guide for the product', dep: 'Approval', resp: 'Tech Lead / Developer' }
];

function shapeFile(file) {
  return {
    id: file.id,
    name: file.file_name,
    data: file.file_data,
    size: file.file_size,
    date: file.upload_date,
    created_at: file.created_at
  };
}

function shapeEntry(projectId, phase, entry, files = []) {
  return {
    id: entry?.id || null,
    project_id: projectId,
    phase_num: phase.num,
    num: phase.num,
    phase: phase.phase,
    desc: phase.desc,
    dep: phase.dep,
    resp: phase.resp,
    status: entry?.status || 'Not Started',
    remarks: entry?.remarks || '',
    files: files.map(shapeFile)
  };
}

// Helper to get tenant_id from request
const getTenantId = (req) => {
  return req.user?.tenant_id;
};

const pttmController = {
  // 1. Database Seeding
  async seedDatabase(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const counts = await pttmModel.seedDatabase(tenantId);
      return res.json({
        ok: true,
        counts
      });
    } catch (err) {
      next(err);
    }
  },

  // 2. Projects (Handled by global Service Management module)

  // 3. Users / Members
  async getUsers(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const users = await pttmModel.getUsers(tenantId);
      return res.json({ success: true, users });
    } catch (err) {
      next(err);
    }
  },

  // 4. Teams
  async getTeams(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const teams = await pttmModel.getTeams(tenantId);
      return res.json(teams);
    } catch (err) {
      next(err);
    }
  },

  async createTeam(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const team = await pttmModel.createTeam(req.body, tenantId);
      return res.status(201).json(team);
    } catch (err) {
      next(err);
    }
  },

  async deleteTeam(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      await pttmModel.deleteTeam(req.params.id, tenantId);
      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  // 5. Phases
  async getPhases(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const phases = await pttmModel.getPhases(tenantId);
      return res.json(phases);
    } catch (err) {
      next(err);
    }
  },

  async createPhase(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const phase = await pttmModel.createPhase(req.body, tenantId);
      return res.status(201).json(phase);
    } catch (err) {
      next(err);
    }
  },

  async deletePhase(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      await pttmModel.deletePhase(req.params.id, tenantId);
      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  // 6. Tasks
  async getTasks(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const filters = {};
      const fields = ['project_id', 'phase_id', 'team_id', 'assigned_user_id', 'team_leader_id', 'status', 'search', 'date_from', 'date_to'];
      fields.forEach(field => {
        if (req.query[field]) {
          filters[field] = req.query[field];
        }
      });

      const tasks = await pttmModel.getTasks(tenantId, filters);
      return res.json(tasks);
    } catch (err) {
      next(err);
    }
  },

  async createTask(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const task = await pttmModel.createTask(req.body, tenantId);
      return res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  },

  async updateTask(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const task = await pttmModel.updateTask(req.params.id, req.body, tenantId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.json(task);
    } catch (err) {
      next(err);
    }
  },

  async patchTaskField(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const { field, value } = req.body;
      const task = await pttmModel.patchTaskField(req.params.id, field, value, tenantId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.json(task);
    } catch (err) {
      next(err);
    }
  },

  async deleteTask(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      await pttmModel.deleteTask(req.params.id, tenantId);
      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  async duplicateTask(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const duplicated = await pttmModel.duplicateTask(req.params.id, tenantId);
      if (!duplicated) return res.status(404).json({ error: 'Task not found' });
      return res.status(201).json(duplicated);
    } catch (err) {
      next(err);
    }
  },

  async insertTask(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const { task = {}, after_id = null, before_id = null } = req.body;
      const inserted = await pttmModel.insertTask(task, after_id, before_id, tenantId);
      return res.status(201).json(inserted);
    } catch (err) {
      next(err);
    }
  },

  // 7. Docflow (Checklist Management)
  async getDocflow(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const projectId = req.params.project_id;
      
      const results = [];
      for (const phase of DOC_PHASES) {
        const entry = await pttmModel.getDocflowEntry(projectId, phase.num, tenantId);
        let files = [];
        if (entry) {
          files = await pttmModel.getDocflowFiles(entry.id, tenantId);
        }
        results.push(shapeEntry(projectId, phase, entry, files));
      }
      
      return res.json(results);
    } catch (err) {
      next(err);
    }
  },

  async upsertDocflow(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const projectId = req.params.project_id;
      const phaseNum = Number(req.params.phase_num);
      const phase = DOC_PHASES.find(item => item.num === phaseNum);
      if (!phase) return res.status(400).json({ error: 'Invalid Doc Flow phase' });

      const { status, remarks } = req.body;
      const saved = await pttmModel.saveDocflowEntry(projectId, phaseNum, status || 'Not Started', remarks || '', tenantId);
      const files = await pttmModel.getDocflowFiles(saved.id, tenantId);

      return res.json(shapeEntry(projectId, phase, saved, files));
    } catch (err) {
      next(err);
    }
  },

  async uploadDocflowFile(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      const projectId = req.params.project_id;
      const phaseNum = Number(req.params.phase_num);
      const phase = DOC_PHASES.find(item => item.num === phaseNum);
      if (!phase) return res.status(400).json({ error: 'Invalid Doc Flow phase' });

      const { name, data, size, date } = req.body;
      if (!name || !data) return res.status(400).json({ error: 'File name and data are required' });
      if (Number(size || 0) > 5 * 1024 * 1024) return res.status(400).json({ error: 'File exceeds 5MB limit' });

      // Find or create entry
      let entry = await pttmModel.getDocflowEntry(projectId, phaseNum, tenantId);
      if (!entry) {
        entry = await pttmModel.saveDocflowEntry(projectId, phaseNum, 'In Progress', '', tenantId);
      }

      const file = await pttmModel.addDocflowFile(entry.id, name, data, size || 0, tenantId);
      return res.status(201).json(shapeFile(file));
    } catch (err) {
      next(err);
    }
  },

  async deleteDocflowFile(req, res, next) {
    try {
      const tenantId = getTenantId(req);
      await pttmModel.deleteDocflowFile(req.params.file_id, tenantId);
      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = pttmController;
