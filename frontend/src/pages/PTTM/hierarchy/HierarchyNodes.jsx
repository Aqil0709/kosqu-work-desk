// Enterprise Hierarchy — Premium org-chart node types
import { Handle, Position } from '@xyflow/react';
import { Building2, Crown, FolderKanban, Star, User, Users } from 'lucide-react';

// ── Status / Priority maps ─────────────────────────────────────────────────────
const STATUS_COLOR = {
  'In Progress': '#3b82f6',
  Planning:      '#8b5cf6',
  Completed:     '#10b981',
  'On Hold':     '#f59e0b',
  'On Going':    '#06b6d4',
};
const PRIORITY_COLOR = {
  critical: '#dc2626',
  high:     '#f97316',
  medium:   '#3b82f6',
  low:      '#10b981',
};
const STATUS_BG = {
  'In Progress': '#3b82f614',
  Planning:      '#8b5cf614',
  Completed:     '#10b98114',
  'On Hold':     '#f59e0b14',
  'On Going':    '#06b6d414',
};

// ── Shared Avatar ──────────────────────────────────────────────────────────────
function Avatar({ name = '', color = '#6366f1', size = 36 }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, ${color}aa)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: Math.round(size * 0.34),
      flexShrink: 0, border: '2.5px solid rgba(255,255,255,0.9)',
      boxShadow: `0 2px 8px ${color}55`,
      letterSpacing: '-0.5px',
    }}>
      {initials || '?'}
    </div>
  );
}

// ── Shared node shell ──────────────────────────────────────────────────────────
function Shell({ children, accent, topHandle, bottomHandle, selected, highlighted, dimmed, minW = 200 }) {
  const isSel = selected;
  const isHi  = highlighted && !selected;
  const boxShadow = isSel
    ? `0 0 0 3px ${accent}, 0 10px 30px rgba(0,0,0,.16)`
    : isHi
      ? `0 0 0 2px ${accent}88, 0 6px 20px rgba(0,0,0,.12)`
      : '0 2px 10px rgba(0,0,0,.07)';

  return (
    <div style={{
      background: 'var(--card-bg,#fff)',
      borderRadius: 14,
      border: `1.5px solid ${isSel || isHi ? accent : 'var(--theme-border,#e9edf3)'}`,
      boxShadow,
      minWidth: minW,
      cursor: 'pointer',
      overflow: 'hidden',
      transition: 'box-shadow .18s, border-color .18s, opacity .18s',
      opacity: dimmed ? 0.18 : 1,
      position: 'relative',
    }}>
      {/* top accent strip */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}66)` }} />

      {topHandle && (
        <Handle type="target" position={Position.Top}
          style={{ background: accent, width: 10, height: 10, border: '2.5px solid #fff', top: -1, zIndex: 10 }} />
      )}
      {children}
      {bottomHandle && (
        <Handle type="source" position={Position.Bottom}
          style={{ background: accent, width: 10, height: 10, border: '2.5px solid #fff', bottom: -1, zIndex: 10 }} />
      )}
    </div>
  );
}

// ── Pill badge ─────────────────────────────────────────────────────────────────
function Pill({ label, color, bg }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: color || '#64748b',
      background: bg || `${color}14`, borderRadius: 20,
      padding: '2px 9px', display: 'inline-block', lineHeight: 1.6,
    }}>{label}</span>
  );
}

// ── CLIENT NODE ────────────────────────────────────────────────────────────────
export function ClientNode({ data, selected }) {
  const C = '#2563eb';
  return (
    <Shell accent={C} bottomHandle selected={selected} highlighted={data._highlighted} dimmed={data._dimmed} minW={300}>
      <div style={{ padding: '18px 20px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${C}, #60a5fa)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: `0 6px 16px ${C}44`,
          }}>
            <Building2 size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: C, marginBottom: 4 }}>
              Client
            </div>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--theme-text-strong,#0f172a)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.name}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Pill label={`${data.projectCount} Project${data.projectCount !== 1 ? 's' : ''}`} color={C} />
        </div>
      </div>
    </Shell>
  );
}

// ── TEAM LEAD NODE ─────────────────────────────────────────────────────────────
export function TeamLeadNode({ data, selected }) {
  const C = '#7c3aed';
  return (
    <Shell accent={C} topHandle bottomHandle selected={selected} highlighted={data._highlighted} dimmed={data._dimmed} minW={270}>
      <div style={{ padding: '14px 18px 13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <Avatar name={data.name} color={C} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Crown size={12} strokeWidth={2.5} /> Team Lead
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--theme-text-strong,#0f172a)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.name}
            </div>
            {data.position && (
              <div style={{ fontSize: 12.5, color: 'var(--theme-text-muted,#64748b)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {data.position}
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 11, display: 'flex', gap: 8 }}>
          <Pill label={`${data.projectCount || 0} Project${(data.projectCount || 0) !== 1 ? 's' : ''}`} color={C} />
        </div>
      </div>
    </Shell>
  );
}

// ── PROJECT NODE ───────────────────────────────────────────────────────────────
export function ProjectNode({ data, selected }) {
  const SC = STATUS_COLOR[data.status] || '#64748b';
  const PC = PRIORITY_COLOR[data.priority] || '#64748b';
  const pct = Math.min(100, Math.max(0, data.progress || 0));
  return (
    <Shell accent={SC} topHandle bottomHandle selected={selected} highlighted={data._highlighted} dimmed={data._dimmed} minW={300}>
      <div style={{ padding: '14px 18px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: `linear-gradient(135deg, ${SC}, ${SC}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FolderKanban size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
              <div style={{ fontWeight: 800, fontSize: 15.5, color: 'var(--theme-text-strong,#0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, lineHeight: 1.2 }}>
                {data.name}
              </div>
              {data.priority && (
                <span style={{ fontSize: 10.5, fontWeight: 800, color: PC, background: `${PC}15`, borderRadius: 6, padding: '3px 8px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {data.priority}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <Pill label={data.status || 'No Status'} color={SC} bg={STATUS_BG[data.status]} />
              <span style={{ fontSize: 12, color: 'var(--theme-text-muted,#64748b)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={11} /> {data.teamSize || 0} members
              </span>
              <span style={{ fontSize: 12, color: 'var(--theme-text-muted,#64748b)' }}>
                {data.taskCount || 0} tasks
              </span>
            </div>
          </div>
        </div>

        {(data.startDate || data.endDate) && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--theme-text-muted,#64748b)', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span>{data.startDate || '—'}</span>
            <span style={{ color: '#cbd5e1' }}>→</span>
            <span>{data.endDate || '—'}</span>
          </div>
        )}

        <div style={{ marginTop: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--theme-text-muted,#64748b)', fontWeight: 600 }}>Progress</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: SC }}>{pct}%</span>
          </div>
          <div style={{ height: 7, borderRadius: 99, background: 'var(--theme-border,#e9edf3)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${SC}, ${SC}cc)`, borderRadius: 99, transition: 'width .4s' }} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ── PROJECT LEAD NODE ──────────────────────────────────────────────────────────
export function ProjectLeadNode({ data, selected }) {
  const C = '#0891b2';
  const mc = data.memberCount || 0;
  return (
    <Shell accent={C} topHandle bottomHandle selected={selected} highlighted={data._highlighted} dimmed={data._dimmed} minW={265}>
      <div style={{ padding: '14px 18px 13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <Avatar name={data.name} color={C} size={50} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: C, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star size={11} strokeWidth={2.5} /> Project Lead
            </div>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: 'var(--theme-text-strong,#0f172a)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.name}
            </div>
            {data.position && (
              <div style={{ fontSize: 12.5, color: 'var(--theme-text-muted,#64748b)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {data.position}
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 11, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill label={`${mc} Member${mc !== 1 ? 's' : ''}`} color={C} />
          {data.projectName && (
            <span style={{ fontSize: 11.5, color: 'var(--theme-text-muted,#64748b)', alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
              {data.projectName}
            </span>
          )}
        </div>
      </div>
    </Shell>
  );
}

// ── MEMBER NODE ────────────────────────────────────────────────────────────────
export function MemberNode({ data, selected }) {
  const C = '#6366f1';
  const SC = STATUS_COLOR[data.projectStatus] || '#64748b';
  return (
    <Shell accent={C} topHandle selected={selected} highlighted={data._highlighted} dimmed={data._dimmed} minW={235}>
      <div style={{ padding: '13px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <Avatar name={data.name} color={C} size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: '#94a3b8', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={10} strokeWidth={2.5} /> Member
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--theme-text-strong,#0f172a)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.name}
            </div>
            {data.position && (
              <div style={{ fontSize: 12, color: 'var(--theme-text-muted,#64748b)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {data.position}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {data.taskCount > 0 && (
            <Pill label={`${data.taskCount} task${data.taskCount !== 1 ? 's' : ''}`} color={C} />
          )}
          {data.projectStatus && (
            <Pill label={data.projectStatus} color={SC} bg={STATUS_BG[data.projectStatus]} />
          )}
        </div>
      </div>
    </Shell>
  );
}
