// frontend/src/pages/admin/PTTM/components/StatusBar.jsx

import { useApp } from '../context/PTTMContext';

export default function StatusBar({ onResizeStart }) {
  const { tasks, projects, users, saving } = useApp();
  return (
    <div id="sbar">
      <div 
        className="sbar-resize-handle" 
        onMouseDown={onResizeStart}
        title="Drag up or down to resize Task Manager height"
      />
      <span className="si2">📊 Total: <b>{tasks.length}</b></span>
      <span className="si2">✅ Completed: <b>{tasks.filter(t => t.status === 'Completed').length}</b></span>
      <span className="si2">🔄 In Progress: <b>{tasks.filter(t => t.status === 'In Progress').length}</b></span>
      <span className="si2">⏳ Pending: <b>{tasks.filter(t => t.status === 'Pending').length}</b></span>
      <span className="si2">📁 Projects: <b>{projects.length}</b></span>
      <span className="si2">👤 Users: <b>{users.length}</b></span>
      <span id="save-st">{saving ? '💾 Saving...' : '✅ Saved'}</span>
      <div className="shortcut-tips">F2 / Enter: Edit &nbsp;·&nbsp; Arrows: Navigate &nbsp;·&nbsp; Tab: Next cell &nbsp;·&nbsp; Ctrl+C/V: Copy/Paste &nbsp;·&nbsp; Del: Clear cell &nbsp;·&nbsp; Right-click: Row menu</div>
    </div>
  );
}
