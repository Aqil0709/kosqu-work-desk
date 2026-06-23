// frontend/src/pages/admin/PTTM/views/DocFlow.jsx

import { useEffect, useState } from 'react';
import { useApp } from '../context/PTTMContext';
import { exportCSV, today } from '../utils/exportCsv';

const statusKey = { 'Not Started': 'ns', 'In Progress': 'ip', 'Waiting for Client': 'wc', Completed: 'done' };
const labels = { 'Not Started': 'Not Started', 'In Progress': 'In Progress', 'Waiting for Client': '⏳ Waiting', Completed: '✅ Done' };
const statuses = ['Not Started', 'In Progress', 'Waiting for Client', 'Completed'];

export default function DocFlow({ selectedProjectId, setSelectedProjectId }) {
  const app = useApp();
  const [entries, setEntries] = useState([]);
  const [openPhase, setOpenPhase] = useState(null);
  const [remarks, setRemarks] = useState({});
  const projectId = selectedProjectId || app.projects[0]?.id || '';

  const load = async id => {
    if (!id) return;
    const rows = await app.getDocflow(id);
    setEntries(rows);
    setRemarks(Object.fromEntries(rows.map(row => [row.phase_num, row.remarks || ''])));
    const first = rows.find(row => row.status !== 'Completed') || rows[0];
    setOpenPhase(first?.phase_num || null);
  };

  useEffect(() => {
    if (!selectedProjectId && app.projects[0]) setSelectedProjectId(app.projects[0].id);
  }, [app.projects, selectedProjectId, setSelectedProjectId]);

  useEffect(() => { load(projectId); }, [projectId]);

  if (!app.projects.length) {
    return (
      <>
        <div className="vh">📄 Document Flow <span style={{ fontSize: 11, fontWeight: 400, color: '#888' }}>-- Track process documents per project</span></div>
        <div className="df-no-project">No projects yet. Add a project first via <b>Manage Data</b>.</div>
      </>
    );
  }

  const done = entries.filter(e => e.status === 'Completed').length;
  const ip = entries.filter(e => e.status === 'In Progress').length;
  const wc = entries.filter(e => e.status === 'Waiting for Client').length;
  const pct = entries.length ? Math.round((done / entries.length) * 100) : 0;

  const updateStatus = async (entry, status) => {
    await app.updateDocflow(projectId, entry.phase_num, { status, remarks: entry.remarks || '' });
    await load(projectId);
  };
  const saveRemarks = async entry => {
    await app.updateDocflow(projectId, entry.phase_num, { status: entry.status, remarks: remarks[entry.phase_num] || '' });
    await load(projectId);
  };
  const upload = async (entry, files) => {
    for (const file of Array.from(files || [])) {
      if (file.size > 5 * 1024 * 1024) {
        app.showToast(`File too large (max 5MB): ${file.name}`);
        continue;
      }
      const data = await readFile(file);
      await app.uploadDocflowFile(projectId, entry.phase_num, { name: file.name, data, size: file.size, date: new Date().toISOString().slice(0, 10) });
    }
    await load(projectId);
    setOpenPhase(entry.phase_num);
  };
  const removeFile = async (entry, fileId) => {
    if (!window.confirm('Remove this file?')) return;
    await app.deleteDocflowFile(projectId, entry.phase_num, fileId);
    await load(projectId);
    setOpenPhase(entry.phase_num);
  };

  return (
    <div>
      <div className="vh">📄 Document Flow <span style={{ fontSize: 11, fontWeight: 400, color: '#888' }}>-- Track process documents per project</span></div>
      <div id="df-project-bar">
        <label>📁 Project:</label>
        <select id="df-proj-sel" value={projectId} onChange={e => setSelectedProjectId(e.target.value)}>
          {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div id="df-prog-summary">
          <span><b>{done}</b>/{entries.length || 9} done</span>
          {ip > 0 && <span style={{ color: '#084298' }}>🔄 {ip} in progress</span>}
          {wc > 0 && <span style={{ color: '#856404' }}>⏳ {wc} waiting</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, minWidth: 160 }}>
          <div className="df-overall-pbar"><div className="df-overall-fill" style={{ width: `${pct}%` }} /></div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--xl-green)', whiteSpace: 'nowrap' }}>{pct}%</span>
        </div>
      </div>
      <div className="df-flow">
        {entries.map((entry, index) => {
          const key = statusKey[entry.status] || 'ns';
          const open = openPhase === entry.phase_num;
          return (
            <div className="df-step" key={entry.phase_num}>
              <div className="df-left">
                <div className={`df-num ${key}`}>{entry.phase_num}</div>
                {index < entries.length - 1 && <div className={`df-connector ${key === 'done' ? 'done' : key === 'ip' ? 'ip' : ''}`} />}
              </div>
              <div className={`df-card ${key === 'done' ? 'done-card' : key === 'ip' ? 'ip-card' : key === 'wc' ? 'wc-card' : ''} ${open ? 'open' : ''}`}>
                <div className="df-card-head" onClick={() => setOpenPhase(open ? null : entry.phase_num)}>
                  <div className="df-phase-name">{entry.phase}</div>
                  <span className={`df-status-badge dfs-${key}`}>{labels[entry.status] || entry.status}</span>
                  {entry.files?.length ? <span style={{ fontSize: 10, color: '#888', marginLeft: 4 }}>📎 {entry.files.length}</span> : null}
                  <span className="df-resp">{entry.resp}</span><span className="df-chevron">▼</span>
                </div>
                <div className="df-body">
                  <div className="df-desc">{entry.desc}</div>
                  <div className="df-meta"><div className="df-meta-item"><span>Depends on</span>{entry.dep}</div><div className="df-meta-item"><span>Responsible</span>{entry.resp}</div></div>
                  <div className="df-row"><label>Status</label><select className="df-status-sel" value={entry.status} onChange={e => updateStatus(entry, e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></div>
                  <div className="df-row"><label>Remarks</label><input className="df-remarks-inp" type="text" placeholder="Notes, links, references..." value={remarks[entry.phase_num] || ''} onChange={e => setRemarks(prev => ({ ...prev, [entry.phase_num]: e.target.value }))} /><button className="df-save-btn" onClick={() => saveRemarks(entry)}>Save</button></div>
                  <div className="df-files-section">
                    <div className="df-files-title">📎 Documents <span style={{ fontWeight: 400, color: '#aaa' }}>(max 5MB per file)</span></div>
                    {!!entry.files?.length && (
                      <ul className="df-file-list">
                        {entry.files.map(file => (
                          <li className="df-file-item" key={file.id}>
                            <span className="fn" title={file.name}>📄 {file.name}</span>
                            <span className="fd">{file.date || ''}</span>
                            <span className="fsize">{fmt(file.size || 0)}</span>
                            <button className="df-file-dl" onClick={() => download(file)}>⬇ Download</button>
                            <button className="df-file-del" onClick={() => removeFile(entry, file.id)} title="Remove">✕</button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="df-upload-zone"><input type="file" multiple onChange={e => upload(entry, e.target.files)} />⬆ Click to upload or drag a file here</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function download(file) {
  const a = document.createElement('a');
  a.href = file.data;
  a.download = file.name;
  a.click();
}
