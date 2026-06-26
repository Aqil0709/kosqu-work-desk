const ShiftTemplateModel = require('./shiftTemplateModel');
const ShiftRotationModel = require('./shiftRotationModel');
const RosterModel        = require('./rosterModel');
const { query }          = require('../../config/db');

// ─── Shift Templates ──────────────────────────────────────────────────────────
exports.getTemplates = async (req, res) => {
  try {
    const data = await ShiftTemplateModel.getAll(req.tenantId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const data = await ShiftTemplateModel.getById(req.tenantId, req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const data = await ShiftTemplateModel.create(req.tenantId, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const data = await ShiftTemplateModel.update(req.tenantId, req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    await ShiftTemplateModel.delete(req.tenantId, req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── Shift Rotations ─────────────────────────────────────────────────────────
exports.getRotations = async (req, res) => {
  try {
    const data = await ShiftRotationModel.getAll(req.tenantId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getRotation = async (req, res) => {
  try {
    const data = await ShiftRotationModel.getById(req.tenantId, req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createRotation = async (req, res) => {
  try {
    const data = await ShiftRotationModel.create(req.tenantId, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateRotation = async (req, res) => {
  try {
    const data = await ShiftRotationModel.update(req.tenantId, req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteRotation = async (req, res) => {
  try {
    await ShiftRotationModel.delete(req.tenantId, req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.assignRotation = async (req, res) => {
  try {
    const data = await ShiftRotationModel.assign(req.tenantId, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── Rosters ─────────────────────────────────────────────────────────────────
exports.getRosters = async (req, res) => {
  try {
    const data = await RosterModel.getAll(req.tenantId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getRoster = async (req, res) => {
  try {
    const data = await RosterModel.getById(req.tenantId, req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createRoster = async (req, res) => {
  try {
    const data = await RosterModel.create(req.tenantId, req.body, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.upsertRosterEntries = async (req, res) => {
  try {
    const { entries } = req.body;
    await RosterModel.bulkUpsertEntries(req.params.id, entries);
    res.json({ success: true, message: 'Roster updated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.autoGenerateRoster = async (req, res) => {
  try {
    const { period_start, period_end } = req.body;
    const roster = await RosterModel.getById(req.tenantId, req.params.id);
    if (!roster) return res.status(404).json({ success: false, message: 'Roster not found' });

    const employees = await query(
      `SELECT ed.employee_id AS id FROM employee_details ed WHERE ed.tenant_id=? AND ed.status='active'`,
      [req.tenantId]
    );
    await RosterModel.autoGenerate(
      req.tenantId, roster.id, employees,
      period_start || roster.period_start,
      period_end   || roster.period_end,
      ShiftRotationModel
    );
    res.json({ success: true, message: `Generated ${employees.length} employee schedules` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.publishRoster = async (req, res) => {
  try {
    await RosterModel.publish(req.tenantId, req.params.id);
    res.json({ success: true, message: 'Roster published' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteRoster = async (req, res) => {
  try {
    await RosterModel.delete(req.tenantId, req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
