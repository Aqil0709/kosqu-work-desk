// frontend/src/pages/admin/PTTM/components/ManagePanel.jsx

import { useEffect, useState } from 'react';
import { useApp } from '../context/PTTMContext';

export default function ManagePanel({ open, tab, setTab, onClose, phaseProjectId = '' }) {
  const app = useApp();
  const [phase, setPhase] = useState({ name: '', project_id: '', order_num: '', description: '' });
  const [team, setTeam] = useState({ name: '', project_id: '' });

  useEffect(() => {
    if (open && tab === 'phases') {
      setPhase(prev => ({ ...prev, project_id: phaseProjectId }));
    }
  }, [open, tab, phaseProjectId]);

  const savePhase = async () => {
    if (!phase.name.trim()) return app.showToast('Phase name required');
    if (!phase.project_id) return app.showToast('Select a project');
    await app.savePhase({ ...phase, order_num: Number(phase.order_num) || 1 });
    setPhase({ name: '', project_id: phaseProjectId || '', order_num: '', description: '' });
  };
  const saveTeam = async () => {
    if (!team.name.trim()) return app.showToast('Team name required');
    await app.saveTeam({ ...team, project_id: team.project_id || null });
    setTeam({ name: '', project_id: '' });
  };

  return (
    <div id="mpanel" className={open ? 'on' : ''}>
      <div id="mph"><span>Manage Data</span><span onClick={onClose}>✕</span></div>
      <div id="mpb">
        <div className="mtabs">
          {['phases', 'teams'].map(id => (
            <button key={id} className={`mtab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
              {id[0].toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
        <div className={`mtc ${tab === 'phases' ? 'on' : ''}`}>
          <h4 style={headStyle}>Add Phase</h4>
          <Field label="Phase Name *"><input value={phase.name} onChange={e => setPhase({ ...phase, name: e.target.value })} placeholder="e.g. Phase 1 - Planning" /></Field>
          <Field label="Project *"><ProjectSelect value={phase.project_id} onChange={project_id => setPhase({ ...phase, project_id })} projects={app.projects} /></Field>
          <Field label="Order"><input type="number" min="1" style={{ width: 80 }} value={phase.order_num} onChange={e => setPhase({ ...phase, order_num: e.target.value })} placeholder="1" /></Field>
          <Field label="Description"><textarea value={phase.description} onChange={e => setPhase({ ...phase, description: e.target.value })} placeholder="Phase description..." /></Field>
          <button className="bsave" onClick={savePhase}>+ Save Phase</button>
          <ListTitle label="All Phases" count={app.phases.length} />
          <ul className="ml">{[...app.phases].sort((a, b) => (a.order_num || 0) - (b.order_num || 0)).map(ph => <ListItem key={ph.id} title={ph.name} meta={`${app.projectName(ph.project_id) || 'No project'}${ph.order_num ? ' · Order ' + ph.order_num : ''}`} onDelete={() => app.deletePhase(ph.id)} />)}</ul>
        </div>
        <div className={`mtc ${tab === 'teams' ? 'on' : ''}`}>
          <h4 style={headStyle}>Add Team</h4>
          <Field label="Team Name *"><input value={team.name} onChange={e => setTeam({ ...team, name: e.target.value })} placeholder="e.g. Backend Team" /></Field>
          <Field label="Project"><ProjectSelect value={team.project_id} onChange={project_id => setTeam({ ...team, project_id })} projects={app.projects} /></Field>
          <button className="bsave" onClick={saveTeam}>+ Save Team</button>
          <ListTitle label="All Teams" count={app.teams.length} />
          <ul className="ml">{app.teams.map(t => <ListItem key={t.id} title={t.name} meta={app.projectName(t.project_id) || 'No project'} onDelete={() => app.deleteTeam(t.id)} />)}</ul>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="fg"><label>{label}</label>{children}</div>;
}

function ProjectSelect({ projects, value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">-- Select Project --</option>
      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}

function ListTitle({ label, count }) {
  return (
    <>
      <hr style={{ margin: '11px 0', borderColor: '#e5e5e5' }} />
      <h4 style={headStyle}>{label} ({count})</h4>
    </>
  );
}

function ListItem({ title, meta, onDelete }) {
  return (
    <li className="mli">
      <span><b>{title}</b><br /><span style={{ fontSize: 11, color: '#888' }}>{meta}</span></span>
      <div className="mlia"><button className="bi d" onClick={onDelete} title="Delete">🗑</button></div>
    </li>
  );
}

const headStyle = { fontSize: 12, marginBottom: 9, color: 'var(--theme-text-muted,#555)', fontWeight: 600 };
