// frontend/src/pages/admin/PTTM/components/Ribbon.jsx

export default function Ribbon({ cellAddr, onAddRow, onDuplicate, onDelete, onOpenPanel, onExport, onImport, onSeed }) {
  return (
    <div id="ribbon">
      <div className="rg">
        <button className="rbtn pri" onClick={onAddRow}>➕ Add Row</button>
        <button className="rbtn" onClick={onDuplicate}>⎘ Duplicate</button>
        <button className="rbtn red" onClick={onDelete}>🗑 Delete Row</button>
      </div>
      <div className="rg">
        {/* <button className="rbtn" onClick={() => onOpenPanel('projects')}>📁 Projects</button> */}
        <button className="rbtn" onClick={() => onOpenPanel('teams')}>👥 Teams</button>
        {/* <button className="rbtn" onClick={() => onOpenPanel('users')}>👤 Users</button> */}
      </div>
      <div className="rg">
        <button className="rbtn" onClick={onExport}>⬇ Export CSV</button>
        <button className="rbtn" onClick={onImport}>⬆ Import CSV</button>
        <button className="rbtn" onClick={onSeed}>↺ Sample Data</button>
      </div>
      <div className="rg" style={{ gap: 6, fontSize: 11, color: 'var(--theme-text-muted,#555)' }}>
        Cell: <span id="cell-addr">{cellAddr}</span>
      </div>
    </div>
  );
}
