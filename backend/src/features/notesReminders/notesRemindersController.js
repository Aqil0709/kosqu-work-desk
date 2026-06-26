const { NotesModel, RemindersModel } = require('./notesRemindersModel');

// ─── Notes ────────────────────────────────────────────────────────────────────
exports.getNotes = async (req, res) => {
  try {
    const { search, archived } = req.query;
    const data = await NotesModel.getAll(req.tenantId, req.user.id, { search, archived: archived === '1' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createNote = async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required' });
    const data = await NotesModel.create(req.tenantId, req.user.id, { title, body });
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    await NotesModel.update(req.tenantId, req.user.id, req.params.id, req.body);
    res.json({ success: true, message: 'Updated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    await NotesModel.delete(req.tenantId, req.user.id, req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── Reminders ────────────────────────────────────────────────────────────────
exports.getReminders = async (req, res) => {
  try {
    const data = await RemindersModel.getAll(req.tenantId, req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createReminder = async (req, res) => {
  try {
    const { title, description, remind_at, priority, repeat_type } = req.body;
    if (!title || !remind_at) return res.status(400).json({ success: false, message: 'Title and remind_at required' });
    const data = await RemindersModel.create(req.tenantId, req.user.id, { title, description, remind_at, priority, repeat_type });
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateReminder = async (req, res) => {
  try {
    await RemindersModel.update(req.tenantId, req.user.id, req.params.id, req.body);
    res.json({ success: true, message: 'Updated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteReminder = async (req, res) => {
  try {
    await RemindersModel.delete(req.tenantId, req.user.id, req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.dismissReminder = async (req, res) => {
  try {
    await RemindersModel.update(req.tenantId, req.user.id, req.params.id, { is_dismissed: 1 });
    res.json({ success: true, message: 'Dismissed' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
