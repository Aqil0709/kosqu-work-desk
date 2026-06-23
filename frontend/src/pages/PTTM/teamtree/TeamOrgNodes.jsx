// Team Org Tree — 4 custom node types
// TeamLeadNode → ProjectLeadNode → ProjectNode → MemberNode
import { Handle, Position } from '@xyflow/react';
import { Crown, Star, FolderKanban, User, ChevronDown, ChevronRight } from 'lucide-react';

// ── shared helpers ─────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  'In Progress': '#3b82f6', Planning: '#8b5cf6', Completed: '#10b981',
  'On Hold': '#f59e0b', 'On Going': '#06b6d4', Pending: '#94a3b8', Delayed: '#ef4444',
};
const PRIORITY_DOT = { critical: '#dc2626', high: '#f97316', medium: '#f59e0b', low: '#64748b' };

function Avatar({ name = '', photo = null, size = 36, bg = '#8b5cf6', ring = null }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: photo ? 'transparent' : `linear-gradient(135deg, ${bg}, ${bg}bb)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.35,
      border: ring ? `2.5px solid ${ring}` : 'none',
      boxShadow: ring ? `0 0 0 2px ${ring}22, 0 2px 8px ${bg}44` : `0 2px 6px ${bg}44`,
    }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  );
}

function CollapseBtn({ collapsed, onClick, color }) {
  return (
    <button onClick={onClick}
      style={{
        position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
        width: 22, height: 22, borderRadius: '50%', border: `2px solid ${color}`,
        background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10, boxShadow: '0 2px 6px rgba(0,0,0,.12)',
      }}>
      {collapsed
        ? <ChevronRight size={11} color={color} />
        : <ChevronDown size={11} color={color} />}
    </button>
  );
}

// ── Team Lead Node — Level 1 (Purple) ─────────────────────────────────────────
export function TeamLeadNode({ data }) {
  const { name, position, profile_photo, projectCount, memberCount, collapsed, onToggle, highlighted } = data;
  const color = '#8b5cf6';
  return (
    <div style={{
      background: highlighted === true  ? '#8b5cf6'
               : highlighted === false ? 'var(--card-bg,#fff)'
               : 'var(--card-bg,#fff)',
      border: `2.5px solid ${highlighted === true ? '#7c3aed' : color}`,
      borderRadius: 16,
      padding: '14px 18px',
      minWidth: 210,
      boxShadow: highlighted === true
        ? `0 0 0 3px ${color}44, 0 8px 24px ${color}33`
        : `0 4px 16px rgba(0,0,0,.08)`,
      position: 'relative',
      cursor: 'default',
      transition: 'all .2s',
    }}>
      {/* Purple top stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg,${color},${color}88)`, borderRadius: '14px 14px 0 0' }} />
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8, bottom: -4 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 6 }}>
        <Avatar name={name} photo={profile_photo} size={42} bg={color} ring={highlighted === true ? '#7c3aed' : null} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <Crown size={10} /> Team Lead
          </div>
          <div style={{ fontWeight: 800, fontSize: '.92rem', color: highlighted === true ? '#fff' : 'var(--theme-text-strong,#0f172a)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          {position && <div style={{ fontSize: '.7rem', color: highlighted === true ? '#e9d5ff' : 'var(--theme-text-muted,#64748b)', marginTop: 1 }}>{position}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: '.67rem', fontWeight: 700, color: highlighted===true?'#e9d5ff':color, background: highlighted===true?'rgba(255,255,255,.15)':`${color}15`, borderRadius: 8, padding: '2px 8px' }}>
          {projectCount} project{projectCount !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '.67rem', fontWeight: 700, color: highlighted===true?'#e9d5ff':'#64748b', background: highlighted===true?'rgba(255,255,255,.12)':'rgba(100,116,139,.1)', borderRadius: 8, padding: '2px 8px' }}>
          {memberCount} member{memberCount !== 1 ? 's' : ''}
        </span>
      </div>

      {onToggle && <CollapseBtn collapsed={collapsed} onClick={onToggle} color={color} />}
    </div>
  );
}

// ── Project Lead Node — Level 2 (Blue) ────────────────────────────────────────
export function ProjectLeadNode({ data }) {
  const { name, position, profile_photo, projectName, collapsed, onToggle, highlighted } = data;
  const color = '#3b82f6';
  return (
    <div style={{
      background: highlighted === true ? '#3b82f6' : 'var(--card-bg,#fff)',
      border: `2px solid ${highlighted === true ? '#1d4ed8' : color}`,
      borderRadius: 14, padding: '12px 16px', minWidth: 190,
      boxShadow: highlighted === true ? `0 0 0 3px ${color}33, 0 6px 20px ${color}33` : '0 3px 12px rgba(0,0,0,.07)',
      position: 'relative', cursor: 'default', transition: 'all .2s',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},${color}77)`, borderRadius: '13px 13px 0 0' }} />
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 7, height: 7, bottom: -3 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
        <Avatar name={name} photo={profile_photo} size={36} bg={color} ring={highlighted===true?'#1d4ed8':null} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: highlighted===true?'#bfdbfe':color, display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
            <Star size={9} /> Project Lead
          </div>
          <div style={{ fontWeight: 700, fontSize: '.85rem', color: highlighted===true?'#fff':'var(--theme-text-strong,#0f172a)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          {position && <div style={{ fontSize: '.67rem', color: highlighted===true?'#bfdbfe':'#64748b', marginTop: 1 }}>{position}</div>}
        </div>
      </div>

      {projectName && (
        <div style={{ marginTop: 8, fontSize: '.67rem', color: highlighted===true?'#dbeafe':color, fontWeight: 600, background: highlighted===true?'rgba(255,255,255,.12)':`${color}12`, borderRadius: 6, padding: '2px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📋 {projectName}
        </div>
      )}
      {onToggle && <CollapseBtn collapsed={collapsed} onClick={onToggle} color={color} />}
    </div>
  );
}

// ── Project Node — Level 3 (Green / Status-colored) ──────────────────────────
export function ProjectNode({ data }) {
  const { name, status, priority, progress, client_name, memberCount, start_date, end_date, collapsed, onToggle, highlighted } = data;
  const sc = STATUS_COLOR[status] || '#10b981';
  const pd = PRIORITY_DOT[priority] || '#64748b';
  const pct = Math.min(100, Math.max(0, progress || 0));

  return (
    <div style={{
      background: 'var(--card-bg,#fff)',
      border: `2px solid ${highlighted ? '#10b981' : sc}`,
      borderRadius: 14, padding: '12px 14px 14px', minWidth: 210,
      boxShadow: highlighted ? `0 0 0 3px ${sc}33, 0 6px 20px ${sc}22` : '0 3px 12px rgba(0,0,0,.07)',
      position: 'relative', cursor: 'default', transition: 'all .2s',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${sc},${sc}66)`, borderRadius: '13px 13px 0 0' }} />
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: sc, width: 7, height: 7, bottom: -3 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingTop: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${sc}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: sc, flexShrink: 0 }}>
          <FolderKanban size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ fontWeight: 800, fontSize: '.87rem', color: 'var(--theme-text-strong,#0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{name}</div>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: pd, flexShrink: 0 }} title={priority} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.62rem', fontWeight: 700, color: sc, background: `${sc}15`, borderRadius: 20, padding: '1px 7px' }}>{status || '—'}</span>
            {client_name && <span style={{ fontSize: '.62rem', color: '#94a3b8' }}>🏢 {client_name}</span>}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>Progress</span>
          <span style={{ fontSize: '.68rem', fontWeight: 800, color: sc }}>{pct}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: 'var(--theme-border,#e2e8f0)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${sc},${sc}cc)`, borderRadius: 99, transition: 'width .4s' }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: '.65rem', color: '#64748b' }}>
        {memberCount > 0 && <span>👤 {memberCount} member{memberCount!==1?'s':''}</span>}
        {end_date && <span style={{ marginLeft: 'auto' }}>📅 {new Date(end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</span>}
      </div>

      {onToggle && <CollapseBtn collapsed={collapsed} onClick={onToggle} color={sc} />}
    </div>
  );
}

// ── Member Node — Level 4 (Neutral) ───────────────────────────────────────────
export function MemberNode({ data }) {
  const { name, position, profile_photo, role, highlighted } = data;
  return (
    <div style={{
      background: highlighted ? '#f0fdf4' : 'var(--card-bg,#fff)',
      border: `1.5px solid ${highlighted ? '#86efac' : 'var(--theme-border,#e2e8f0)'}`,
      borderRadius: 12, padding: '9px 12px', minWidth: 158,
      boxShadow: highlighted ? '0 0 0 2px #86efac55' : '0 2px 8px rgba(0,0,0,.06)',
      position: 'relative', cursor: 'default', transition: 'all .2s',
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name={name} photo={profile_photo} size={30} bg="#64748b" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 1 }}>
            <User size={9} /> {role === 'observer' ? 'Observer' : 'Member'}
          </div>
          <div style={{ fontWeight: 700, fontSize: '.8rem', color: 'var(--theme-text-strong,#0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          {position && <div style={{ fontSize: '.65rem', color: '#94a3b8' }}>{position}</div>}
        </div>
      </div>
    </div>
  );
}
