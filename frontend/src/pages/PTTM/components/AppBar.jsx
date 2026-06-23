// frontend/src/pages/admin/PTTM/components/AppBar.jsx

export default function AppBar({ onOpenPanel }) {
  return (
    <div id="app-bar">
      <div className="logo"> <span>PTTM</span></div>
      <span className="sub">Project · Team · Task Tracker</span>
      <div style={{ flex: 1 }} />
      <button className="bar-btn" onClick={() => onOpenPanel('projects')}>⚙ Manage Data</button>
    </div>
  );
}
