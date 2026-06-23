// frontend/src/pages/admin/PTTM/components/ViewTabs.jsx

const tabs = [
  ['kanban',      '🗂 Kanban'],
  ['dashboard',   '📊 Dashboard'],
  ['dependency',  '🔗 Dependencies'],
  ['timeline',    '📆 Timeline'],
  ['summary',     '📈 Summary'],
  ['phases',      '📍 Modules'],
  ['sprints',     '🏃 Sprints'],
  ['milestones',  '🏁 Milestones'],
  ['workload',    '👥 Workload'],
  ['risks',       '⚠️ Risks'],
  ['workreports', '📝 Reports'],
  ['daily',       '📅 Daily Log'],
  ['docflow',     '📄 Doc Flow'],
  ['projectdocs', '📁 Project Docs'],
];

export default function ViewTabs({ view, onChange }) {
  return (
    <div id="view-tabs">
      {tabs.map(([id, label]) => (
        <div key={id} className={`vtab ${view === id ? 'active' : ''}`} onClick={() => onChange(id)} data-v={id}>
          {label}
        </div>
      ))}
    </div>
  );
}
