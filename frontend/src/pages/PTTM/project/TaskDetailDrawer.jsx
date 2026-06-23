// Jira-style Task Detail Drawer — slide-in panel with comments + activity
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  X, MessageSquare, Clock, Calendar, User, Flag, Tag,
  ChevronDown, Send, Trash2, Edit3, Check, AlertCircle,
  Activity, ExternalLink, Loader2,
} from 'lucide-react';
import './TaskDetailDrawer.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const KANBAN_LABELS = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress',
  review: 'Review', testing: 'Testing', done: 'Done',
};
const KANBAN_COLORS = {
  backlog: '#94a3b8', todo: '#f59e0b', in_progress: '#3b82f6',
  review: '#8b5cf6', testing: '#06b6d4', done: '#10b981',
};
const PRIORITY_COLOR = { critical: '#dc2626', high: '#f97316', medium: '#3b82f6', low: '#64748b' };
const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'On Going', 'Pending'];

function Avatar({ name = '', size = 28, color = '#5B4FF7' }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className="tdd-avatar" style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}bb)`, fontSize: size * 0.33 }}>
      {initials || '?'}
    </div>
  );
}

function TimeAgo({ date }) {
  if (!date) return null;
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const label = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : hrs < 24 ? `${hrs}h ago` : `${days}d ago`;
  return <span className="tdd-timeago" title={d.toLocaleString()}>{label}</span>;
}

export default function TaskDetailDrawer({ task, users = [], onClose, onSave }) {
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'comments' | 'activity'
  const [activity, setActivity] = useState([]);
  const commentRef = useRef(null);

  useEffect(() => {
    if (!task) return;
    setForm({ ...task });
    setEditing(false);
    setActiveTab('details');
    loadComments();
  }, [task?.id]);

  const loadComments = useCallback(async () => {
    if (!task?.id) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/pttm/tasks/${task.id}/comments`, { headers: auth() });
      setComments(r.data.comments || []);
    } catch (_) {}
    setLoading(false);
  }, [task?.id]);

  const submitComment = async () => {
    if (!newComment.trim() || !task?.id) return;
    setSending(true);
    try {
      await axios.post(`${API}/api/pttm/tasks/${task.id}/comments`,
        { comment: newComment.trim() }, { headers: auth() });
      setNewComment('');
      await loadComments();
    } catch (_) {}
    setSending(false);
  };

  const deleteComment = async (cid) => {
    try {
      await axios.delete(`${API}/api/pttm/tasks/${task.id}/comments/${cid}`, { headers: auth() });
      setComments(cs => cs.filter(c => c.id !== cid));
    } catch (_) {}
  };

  const handleSave = async () => {
    if (!task?.id) return;
    setSaving(true);
    try {
      await axios.put(`${API}/api/pttm/tasks/${task.id}`, form, { headers: auth() });
      setEditing(false);
      onSave?.(form);
    } catch (_) {}
    setSaving(false);
  };

  const quickPatch = async (field, value) => {
    try {
      await axios.patch(`${API}/api/pttm/tasks/${task.id}`, { [field]: value }, { headers: auth() });
      setForm(f => ({ ...f, [field]: value }));
      onSave?.({ ...form, [field]: value });
    } catch (_) {}
  };

  if (!task) return null;

  const assigneeName = (() => {
    const u = users.find(u => u.id === form.assigned_user_id);
    return u ? `${u.first_name} ${u.last_name}` : '—';
  })();

  const kColor = KANBAN_COLORS[form.kanban_status] || '#94a3b8';
  const pColor = PRIORITY_COLOR[form.priority] || '#64748b';

  return (
    <div className="tdd-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="tdd-drawer">
        {/* Header */}
        <div className="tdd-header">
          <div className="tdd-header-left">
            <span className="tdd-task-id">TASK</span>
            <span className="tdd-status-chip" style={{ background: `${kColor}18`, color: kColor, borderColor: `${kColor}30` }}>
              {KANBAN_LABELS[form.kanban_status] || form.status || 'No Status'}
            </span>
          </div>
          <div className="tdd-header-right">
            {!editing ? (
              <button className="tdd-edit-btn" onClick={() => setEditing(true)}>
                <Edit3 size={14} /> Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="tdd-cancel-btn" onClick={() => { setEditing(false); setForm({ ...task }); }}>Cancel</button>
                <button className="tdd-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={13} className="tdd-spin" /> : <Check size={13} />} Save
                </button>
              </div>
            )}
            <button className="tdd-close-btn" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Title */}
        <div className="tdd-title-section">
          {editing ? (
            <input className="tdd-title-input" value={form.task_title || ''}
              onChange={e => setForm(f => ({ ...f, task_title: e.target.value }))} />
          ) : (
            <h2 className="tdd-title">{form.task_title || '(Untitled)'}</h2>
          )}
        </div>

        {/* Tab bar */}
        <div className="tdd-tabs">
          {[
            { id: 'details',  label: 'Details',  icon: <Tag size={13} /> },
            { id: 'comments', label: `Comments (${comments.length})`, icon: <MessageSquare size={13} /> },
          ].map(t => (
            <button key={t.id} className={`tdd-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(t.id); if (t.id === 'comments') loadComments(); }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="tdd-content">
          {activeTab === 'details' && (
            <>
              {/* Description */}
              <div className="tdd-section">
                <label className="tdd-label">Description</label>
                {editing ? (
                  <textarea className="tdd-desc-input" rows={4}
                    value={form.description || ''}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Add a description…" />
                ) : (
                  <div className="tdd-desc">
                    {form.description || <span className="tdd-empty">No description</span>}
                  </div>
                )}
              </div>

              {/* Meta grid */}
              <div className="tdd-meta-grid">
                {/* Status */}
                <div className="tdd-meta-item">
                  <span className="tdd-meta-label"><Flag size={12} /> Priority</span>
                  {editing ? (
                    <select className="tdd-meta-select"
                      value={form.priority || 'medium'}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <span className="tdd-meta-badge" style={{ color: pColor, background: `${pColor}18` }}>
                      {form.priority || 'medium'}
                    </span>
                  )}
                </div>

                {/* Kanban status */}
                <div className="tdd-meta-item">
                  <span className="tdd-meta-label"><Activity size={12} /> Stage</span>
                  {editing ? (
                    <select className="tdd-meta-select"
                      value={form.kanban_status || 'backlog'}
                      onChange={e => setForm(f => ({ ...f, kanban_status: e.target.value }))}>
                      {Object.entries(KANBAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  ) : (
                    <span className="tdd-meta-badge" style={{ color: kColor, background: `${kColor}18` }}>
                      {KANBAN_LABELS[form.kanban_status] || 'Backlog'}
                    </span>
                  )}
                </div>

                {/* Assignee */}
                <div className="tdd-meta-item">
                  <span className="tdd-meta-label"><User size={12} /> Assigned To</span>
                  {editing ? (
                    <select className="tdd-meta-select"
                      value={form.assigned_user_id || ''}
                      onChange={e => setForm(f => ({ ...f, assigned_user_id: e.target.value || null }))}>
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                    </select>
                  ) : (
                    <div className="tdd-meta-user">
                      <Avatar name={assigneeName} size={20} />
                      <span>{assigneeName}</span>
                    </div>
                  )}
                </div>

                {/* Due date */}
                <div className="tdd-meta-item">
                  <span className="tdd-meta-label"><Calendar size={12} /> Due Date</span>
                  {editing ? (
                    <input type="date" className="tdd-meta-input"
                      value={form.due_date || ''}
                      onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                  ) : (
                    <span className={`tdd-meta-text ${form.due_date && new Date(form.due_date) < new Date() ? 'tdd-overdue' : ''}`}>
                      {form.due_date ? new Date(form.due_date).toLocaleDateString('en-IN') : '—'}
                    </span>
                  )}
                </div>

                {/* Estimated hours */}
                <div className="tdd-meta-item">
                  <span className="tdd-meta-label"><Clock size={12} /> Est. Hours</span>
                  {editing ? (
                    <input type="number" className="tdd-meta-input" min="0" step="0.5"
                      value={form.estimated_hours || ''}
                      onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} />
                  ) : (
                    <span className="tdd-meta-text">{form.estimated_hours ? `${form.estimated_hours}h` : '—'}</span>
                  )}
                </div>

                {/* Actual hours */}
                <div className="tdd-meta-item">
                  <span className="tdd-meta-label"><Clock size={12} /> Actual Hours</span>
                  {editing ? (
                    <input type="number" className="tdd-meta-input" min="0" step="0.5"
                      value={form.actual_hours || ''}
                      onChange={e => setForm(f => ({ ...f, actual_hours: e.target.value }))} />
                  ) : (
                    <span className="tdd-meta-text">{form.actual_hours ? `${form.actual_hours}h` : '—'}</span>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="tdd-section">
                <label className="tdd-label">Remarks</label>
                {editing ? (
                  <textarea className="tdd-desc-input" rows={2}
                    value={form.remarks || ''}
                    onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                    placeholder="Any notes or blockers…" />
                ) : (
                  <div className="tdd-desc">
                    {form.remarks || <span className="tdd-empty">No remarks</span>}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'comments' && (
            <div className="tdd-comments">
              {loading ? (
                <div className="tdd-comments-loading"><Loader2 size={18} className="tdd-spin" /> Loading comments…</div>
              ) : comments.length === 0 ? (
                <div className="tdd-comments-empty">
                  <MessageSquare size={28} />
                  <p>No comments yet. Start the conversation.</p>
                </div>
              ) : (
                <div className="tdd-comment-list">
                  {comments.map(c => (
                    <div key={c.id} className="tdd-comment">
                      <Avatar name={`${c.first_name || ''} ${c.last_name || ''}`} size={30} />
                      <div className="tdd-comment-body">
                        <div className="tdd-comment-meta">
                          <span className="tdd-comment-author">{c.first_name} {c.last_name}</span>
                          <TimeAgo date={c.created_at} />
                          <button className="tdd-comment-del" onClick={() => deleteComment(c.id)} title="Delete">
                            <Trash2 size={11} />
                          </button>
                        </div>
                        <div className="tdd-comment-text">{c.comment}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              <div className="tdd-comment-input-row">
                <textarea
                  ref={commentRef}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment(); }}
                  placeholder="Write a comment… (Ctrl+Enter to submit)"
                  rows={2}
                  className="tdd-comment-input"
                />
                <button className="tdd-comment-send" onClick={submitComment} disabled={!newComment.trim() || sending}>
                  {sending ? <Loader2 size={15} className="tdd-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
