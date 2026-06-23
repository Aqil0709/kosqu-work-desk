// frontend/src/pages/PTTM/views/Dashboard.jsx  – v3 professional redesign

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/PTTMContext';
import { exportCSV, today } from '../utils/exportCsv';
import axios from 'axios';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, LabelList, AreaChart, Area
} from 'recharts';

/* ─── design tokens ──────────────────────────────────────────────── */
const C = {
  completed:  '#10b981',
  inProgress: '#6366f1',
  pending:    '#f59e0b',
  notStarted: 'var(--theme-text-muted,#94a3b8)',
  onGoing:    '#8b5cf6',
  danger:     '#ef4444',
  bg:         'var(--theme-bg-muted,#f1f5f9)',
  card:       'var(--card-bg,#fff)',
  border:     'rgba(226,232,240,0.8)',
  text:       'var(--theme-text-strong,#0f172a)',
  muted:      'var(--theme-text-muted,#64748b)',
  subtle:     'var(--theme-text-muted,#94a3b8)',
};

const STATUS_COLORS = {
  'Completed':   C.completed,
  'In Progress': C.inProgress,
  'Pending':     C.pending,
  'Not Started': C.notStarted,
  'On Going':    C.onGoing,
};

const PIE_PALETTE = ['#6366f1','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316'];

/* ─── shared tooltip ─────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--card-bg,#fff)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 8px 24px rgba(0,0,0,0.12)' }}>
      {label && <p style={{ color:'var(--theme-text-strong,#0f172a)', marginBottom:6, fontWeight:600 }}>{label}</p>}
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, margin:'3px 0', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:p.color, display:'inline-block' }} />
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── KPI Card ───────────────────────────────────────────────────── */
const KpiCard = ({ icon, label, value, sub, accent = '#6366f1', pct, gradient }) => (
  <div style={{
    background: gradient || C.card,
    borderRadius: 16, padding: '20px 22px',
    border: `1px solid ${C.border}`,
    boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)',
    display: 'flex', alignItems: 'flex-start', gap: 14,
    transition: 'transform .18s, box-shadow .18s',
    cursor: 'default',
    position: 'relative', overflow: 'hidden',
  }}
  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,.1)'; }}
  onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)'; }}
  >
    {/* accent blob */}
    <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:accent+'18', pointerEvents:'none' }} />
    <div style={{
      width:46, height:46, borderRadius:13,
      background: accent+'18',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:22, flexShrink:0,
    }}>{icon}</div>
    <div style={{ minWidth:0, flex:1 }}>
      <p style={{ margin:0, fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</p>
      <p style={{ margin:'5px 0 3px', fontSize:26, fontWeight:800, color: gradient ? '#fff' : C.text, lineHeight:1 }}>{value}</p>
      {sub && <p style={{ margin:0, fontSize:11, color: gradient ? 'rgba(255,255,255,.7)' : C.subtle }}>{sub}</p>}
      {pct !== undefined && (
        <div style={{ marginTop:8, height:3, background:'rgba(0,0,0,.06)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:accent, borderRadius:2, transition:'width .6s ease' }} />
        </div>
      )}
    </div>
  </div>
);

/* ─── Section Card ────────────────────────────────────────────────── */
const SCard = ({ title, children, action, style={} }) => (
  <div style={{
    background: C.card, borderRadius:16,
    border:`1px solid ${C.border}`,
    boxShadow:'0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)',
    overflow:'hidden', ...style,
  }}>
    {title && (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px 0' }}>
        <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:C.text }}>{title}</h3>
        {action}
      </div>
    )}
    <div style={{ padding:'16px 22px' }}>{children}</div>
  </div>
);

/* ─── Progress bar ────────────────────────────────────────────────── */
const ProgressBar = ({ pct, color = C.inProgress }) => (
  <div style={{ height:5, background:'var(--theme-bg-muted,#f1f5f9)', borderRadius:3, overflow:'hidden', flex:1 }}>
    <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width .6s ease' }} />
  </div>
);

/* ─── Status badge ────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const color = STATUS_COLORS[status] || C.muted;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 10px', borderRadius:20,
      background:color+'18', color,
      fontSize:11, fontWeight:700, letterSpacing:'.02em',
    }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:color, display:'inline-block' }} />
      {status || 'Unknown'}
    </span>
  );
};

/* ─── Client Teams Panel (inside Dashboard) ──────────────────────── */
function ClientTeamsPanel() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  const [clients, setClients] = useState([]);
  const [teamsByClient, setTeamsByClient] = useState({});
  const [loading, setLoading] = useState(true);
  const { tasks } = useApp();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/clients`, { headers: authH() });
        const list = data?.clients || data?.data || [];
        setClients(list);
        const results = await Promise.allSettled(
          list.map(c => axios.get(`${API_BASE}/api/pttm/client-teams`, { headers: authH(), params: { client_id: c.id } }))
        );
        const map = {};
        list.forEach((c, i) => {
          map[c.id] = results[i].status === 'fulfilled' ? (results[i].value.data?.teams || []) : [];
        });
        setTeamsByClient(map);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div style={{ color:C.muted, fontSize:13, padding:'20px 0', textAlign:'center' }}>Loading client teams...</div>;
  if (!clients.length) return <div style={{ color:C.muted, fontSize:13, padding:'20px 0', textAlign:'center' }}>No clients found. Add clients in the Client module.</div>;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px,1fr))', gap:14 }}>
      {clients.map(c => {
        const teams = teamsByClient[c.id] || [];
        const clientTasks = tasks.filter(t => teams.some(tm => tm.id === t.team_id));
        const done = clientTasks.filter(t => t.status === 'Completed').length;
        const pct = clientTasks.length ? Math.round((done/clientTasks.length)*100) : 0;
        return (
          <div key={c.id} style={{
            background:'linear-gradient(135deg,#f8fafc 0%,#fff 100%)',
            border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px',
            transition:'transform .18s, box-shadow .18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div>
                <p style={{ margin:0, fontWeight:700, fontSize:14, color:C.text }}>{c.name || c.company_name}</p>
                <p style={{ margin:'2px 0 0', fontSize:11, color:C.muted }}>{teams.length} team{teams.length!==1?'s':''} · {clientTasks.length} task{clientTasks.length!==1?'s':''}</p>
              </div>
              <div style={{
                width:38, height:38, borderRadius:'50%',
                background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontWeight:800, fontSize:13, flexShrink:0,
              }}>{(c.name||c.company_name||'?')[0].toUpperCase()}</div>
            </div>

            {teams.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
                {teams.slice(0,4).map(t => (
                  <span key={t.id} style={{
                    background:'rgba(99,102,241,0.1)', color:'#6366f1',
                    borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:600,
                  }}>{t.team_name}</span>
                ))}
                {teams.length > 4 && <span style={{ background:'var(--theme-bg-muted,#f1f5f9)', color:C.muted, borderRadius:6, padding:'2px 8px', fontSize:11 }}>+{teams.length-4}</span>}
              </div>
            )}

            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <ProgressBar pct={pct} color={pct>=70?C.completed:pct>=40?C.inProgress:C.pending} />
              <span style={{ fontSize:11, fontWeight:700, color:C.muted, minWidth:30, textAlign:'right' }}>{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Dashboard Component
   ═══════════════════════════════════════════════════════════════════ */
export default function Dashboard({ switchGrid }) {
  const app = useApp();
  const { tasks, projects, phases, teams, users } = app;
  const [docHealth, setDocHealth] = useState([]);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const todayStr = today();

  useEffect(() => {
    if (!projects.length) return;
    let mounted = true;
    setLoadingDoc(true);
    Promise.all(projects.map(async p => {
      const rows = await app.getDocflow(p.id);
      return { project: p, rows };
    })).then(results => {
      if (mounted) { setDocHealth(results); setLoadingDoc(false); }
    });
    return () => { mounted = false; };
  }, [projects, app]);

  /* ─── derived stats ─────────────────────────────────────────────── */
  const totTasks    = tasks.length;
  const completed   = tasks.filter(t => t.status === 'Completed').length;
  const inProgress  = tasks.filter(t => t.status === 'In Progress').length;
  const pending     = tasks.filter(t => t.status === 'Pending').length;
  const onGoing     = tasks.filter(t => t.status === 'On Going').length;
  const notStarted  = tasks.filter(t => t.status === 'Not Started').length;
  const activeProjects = projects.filter(p => p.status !== 'Completed').length;

  const pctCompleted = totTasks ? Math.round((completed / totTasks) * 100) : 0;
  const pctIP        = totTasks ? Math.round((inProgress / totTasks) * 100) : 0;
  const pctPending   = totTasks ? Math.round((pending / totTasks) * 100) : 0;

  /* donut */
  const donutData = Object.entries({
    'Completed': completed, 'In Progress': inProgress,
    'Pending': pending, 'On Going': onGoing, 'Not Started': notStarted,
  }).filter(([,v]) => v > 0).map(([k,v]) => ({ name:k, value:v }));

  /* project completion */
  const projCompletionData = useMemo(() => projects.map(p => {
    const pt   = tasks.filter(t => t.project_id === p.id);
    const done = pt.filter(t => t.status === 'Completed').length;
    const pct  = pt.length ? Math.round((done / pt.length) * 100) : 0;
    return {
      name: p.name.length > 16 ? p.name.slice(0,16)+'...' : p.name,
      full: p.name, pct, pt: pt.length, done,
      ip:   pt.filter(t => t.status === 'In Progress').length,
      pend: pt.filter(t => t.status === 'Pending').length,
    };
  }).sort((a,b) => b.pct - a.pct), [projects, tasks]);

  /* daily activity (last 30d) */
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const thirtyStr = thirtyAgo.toISOString().split('T')[0];
  const dailyGroups = tasks.filter(t => t.date && t.date >= thirtyStr)
    .reduce((acc, t) => { acc[t.date] = acc[t.date] || {all:0,done:0}; acc[t.date].all++; if(t.status==='Completed') acc[t.date].done++; return acc; }, {});
  const lineData = Object.keys(dailyGroups).sort().map(d => ({
    date: new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}),
    All: dailyGroups[d].all, Completed: dailyGroups[d].done,
  }));

  /* team workload */
  const teamWorkload = useMemo(() => users.map(u => {
    const ut  = tasks.filter(t => t.assigned_user_id === u.id);
    const done = ut.filter(t => t.status==='Completed').length;
    return {
      name: u.name.split(' ')[0], fullName: u.name,
      total: ut.length, Completed: done,
      'In Progress': ut.filter(t=>t.status==='In Progress').length,
      Pending: ut.filter(t=>t.status==='Pending').length,
      Other: ut.length - done - ut.filter(t=>t.status==='In Progress').length - ut.filter(t=>t.status==='Pending').length,
    };
  }).sort((a,b)=>b.total-a.total).slice(0,8), [users, tasks]);

  /* project status stacked */
  const projStatusData = useMemo(() => projects.map(p => {
    const pt = tasks.filter(t => t.project_id === p.id);
    return {
      name: p.name.length>12 ? p.name.slice(0,12)+'...' : p.name,
      Completed:    pt.filter(t=>t.status==='Completed').length,
      'In Progress':pt.filter(t=>t.status==='In Progress').length,
      Pending:      pt.filter(t=>t.status==='Pending').length,
      'Not Started':pt.filter(t=>t.status==='Not Started').length,
      'On Going':   pt.filter(t=>t.status==='On Going').length,
    };
  }).sort((a,b)=>(b.Completed+b['In Progress'])-(a.Completed+a['In Progress'])).slice(0,8), [projects, tasks]);

  /* bottlenecks */
  const bottlenecksData = phases.map(ph => ({
    name: ph.name,
    blocked: tasks.filter(t => t.phase_id===ph.id && ['Pending','Not Started'].includes(t.status)).length,
  })).filter(d=>d.blocked>0).sort((a,b)=>b.blocked-a.blocked).slice(0,6);

  /* at-risk */
  const atRiskProjects = projects.filter(p => {
    if (p.status==='Completed') return false;
    if (p.end_date && p.end_date < todayStr) return true;
    if (p.status==='In Progress' && p.end_date) {
      const pt = tasks.filter(t=>t.project_id===p.id);
      const pct = pt.length ? Math.round((pt.filter(t=>t.status==='Completed').length/pt.length)*100) : 0;
      const diff = Math.ceil((new Date(p.end_date)-new Date(todayStr))/(1000*60*60*24));
      return pct<30 && diff>=0 && diff<=14;
    }
    return false;
  }).map(p => {
    const pt = tasks.filter(t=>t.project_id===p.id);
    const done = pt.filter(t=>t.status==='Completed').length;
    const pct  = pt.length ? Math.round((done/pt.length)*100) : 0;
    const diff = Math.ceil((new Date(p.end_date||todayStr)-new Date(todayStr))/(1000*60*60*24));
    return { name:p.name, end_date:p.end_date, pct, status:p.status, diff };
  });

  /* recent tasks */
  const recentTasks = [...tasks].filter(t=>t.date).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);

  /* export */
  const handleExport = () => {
    const arr = [
      ['KPI SUMMARY'],['Metric','Value','%'],
      ['Total Tasks',totTasks,''],['Completed',completed,`${pctCompleted}%`],
      ['In Progress',inProgress,`${pctIP}%`],['Pending',pending,`${pctPending}%`],
      ['Active Projects',activeProjects,''],['Team Members',users.length,''],
    ];
    exportCSV(arr, `Dashboard_${todayStr}.csv`);
  };

  /* ─── empty state ────────────────────────────────────────────────── */
  if (!totTasks) {
    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:C.bg, gap:12 }}>
        <div style={{ width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex',alignItems:'center',justifyContent:'center',fontSize:32 }}>📋</div>
        <h2 style={{ color:C.text, fontWeight:800, fontSize:20 }}>No tasks yet</h2>
        <p style={{ color:C.muted, fontSize:14, textAlign:'center', maxWidth:320 }}>Add projects and tasks to see your project management dashboard.</p>
        <button className="btn-primary" onClick={switchGrid} style={{ marginTop:4 }}>
          + Go to Task Grid
        </button>
      </div>
    );
  }

  /* ─── layout helpers ─────────────────────────────────────────────── */
  const Row = ({ children, gap=16, style={} }) => (
    <div style={{ display:'flex', gap, flexWrap:'wrap', marginBottom:20, ...style }}>{children}</div>
  );
  const Col = ({ flex=1, min=300, children }) => (
    <div style={{ flex, minWidth:min, maxWidth:'100%' }}>{children}</div>
  );

  return (
    <div style={{ padding:20, background:C.bg, height:'100%', overflowY:'auto', fontFamily:'"Inter",system-ui,sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:C.text, letterSpacing:'-0.4px' }}>Project Dashboard</h1>
          <p style={{ margin:'3px 0 0', fontSize:12, color:C.muted }}>Real-time overview · {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
        </div>
        <button onClick={handleExport} style={{
          display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px',
          background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff',
          border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer',
          boxShadow:'0 2px 10px rgba(99,102,241,.3)',
        }}>
          ↓ Export Summary
        </button>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:14, marginBottom:20 }}>
        <KpiCard icon="📋" label="Total Tasks"      value={totTasks}    accent="#6366f1" pct={100} />
        <KpiCard icon="✅" label="Completed"        value={`${completed} (${pctCompleted}%)`}  accent={C.completed} pct={pctCompleted} />
        <KpiCard icon="🔄" label="In Progress"      value={inProgress}  accent={C.inProgress} pct={pctIP} />
        <KpiCard icon="⏳" label="Pending"          value={pending}     accent={C.pending}    pct={pctPending} />
        <KpiCard icon="📁" label="Active Projects"  value={activeProjects}  accent="#8b5cf6" />
        <KpiCard icon="👤" label="Team Members"     value={users.length}    accent="#06b6d4" />
      </div>

      {/* ── Row 1: Donut + Project Completion ── */}
      <Row>
        <Col flex={4} min={280}>
          <SCard title="Task Status Distribution">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={donutData} innerRadius={62} outerRadius={90} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                  {donutData.map((e,i) => <Cell key={i} fill={STATUS_COLORS[e.name] || PIE_PALETTE[i % PIE_PALETTE.length]} stroke="none" />)}
                </Pie>
                <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize:28, fontWeight:800, fill:C.text }}>{totTasks}</text>
                <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize:11, fill:C.muted }}>Total Tasks</text>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={32} iconType="circle" iconSize={8} formatter={v=><span style={{ fontSize:11, color:C.muted }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </SCard>
        </Col>
        <Col flex={6} min={320}>
          <SCard title="Project Completion %">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={projCompletionData} layout="vertical" margin={{ left:10, right:36, top:4, bottom:4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-bg-muted,#f1f5f9)" />
                <XAxis type="number" domain={[0,100]} hide />
                <YAxis dataKey="name" type="category" width={110} tickLine={false} axisLine={false} tick={{ fontSize:11, fill:C.muted }} interval={0} />
                <Tooltip content={<CustomTooltip />} formatter={v=>[`${v}%`,'Done']} />
                <Bar dataKey="pct" radius={[0,6,6,0]} barSize={14}>
                  {projCompletionData.map((e,i) => (
                    <Cell key={i} fill={e.pct>=80?C.completed:e.pct>=40?C.inProgress:C.pending} />
                  ))}
                  <LabelList dataKey="pct" position="right" formatter={v=>`${v}%`} style={{ fontSize:11, fill:C.muted }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SCard>
        </Col>
      </Row>

      {/* ── Row 2: Daily Activity + Team Workload ── */}
      <Row>
        <Col flex={6} min={320}>
          <SCard title="Daily Task Activity - Last 30 Days">
            {lineData.length === 0 ? (
              <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, fontSize:13 }}>No task date data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={lineData} margin={{ top:8, right:8, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="gradAll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.inProgress} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.inProgress} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.completed} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.completed} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-bg-muted,#f1f5f9)" />
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:C.muted }} tickMargin={8} minTickGap={16} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize:10, fill:C.muted }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={v=><span style={{ fontSize:11, color:C.muted }}>{v}</span>} />
                  <Area type="monotone" dataKey="All"       stroke={C.inProgress} strokeWidth={2} fill="url(#gradAll)"  dot={false} activeDot={{ r:5, strokeWidth:0 }} />
                  <Area type="monotone" dataKey="Completed" stroke={C.completed}  strokeWidth={2} fill="url(#gradDone)" dot={false} activeDot={{ r:5, strokeWidth:0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SCard>
        </Col>
        <Col flex={4} min={280}>
          <SCard title="Team Workload">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={teamWorkload} margin={{ top:8, right:8, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-bg-muted,#f1f5f9)" />
                <XAxis dataKey="name" tick={{ fontSize:10, fill:C.muted }} axisLine={false} tickLine={false} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize:10, fill:C.muted }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={v=><span style={{ fontSize:11, color:C.muted }}>{v}</span>} />
                <Bar dataKey="Completed"   stackId="a" fill={C.completed}  barSize={18} />
                <Bar dataKey="In Progress" stackId="a" fill={C.inProgress} />
                <Bar dataKey="Pending"     stackId="a" fill={C.pending} />
                <Bar dataKey="Other"       stackId="a" fill={C.notStarted} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </SCard>
        </Col>
      </Row>

      {/* ── Row 3: Task by Project + Bottlenecks ── */}
      <Row>
        <Col flex={6} min={320}>
          <SCard title="Task Status by Project">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projStatusData} margin={{ top:8, right:8, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-bg-muted,#f1f5f9)" />
                <XAxis dataKey="name" tick={{ fontSize:10, fill:C.muted }} axisLine={false} tickLine={false} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize:10, fill:C.muted }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={v=><span style={{ fontSize:11, color:C.muted }}>{v}</span>} />
                <Bar dataKey="Completed"    stackId="a" fill={C.completed}  barSize={22} />
                <Bar dataKey="In Progress"  stackId="a" fill={C.inProgress} />
                <Bar dataKey="Pending"      stackId="a" fill={C.pending} />
                <Bar dataKey="Not Started"  stackId="a" fill={C.notStarted} />
                <Bar dataKey="On Going"     stackId="a" fill={C.onGoing} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </SCard>
        </Col>
        <Col flex={4} min={260}>
          <SCard title="⚠ Phase Bottlenecks">
            {bottlenecksData.length === 0 ? (
              <div style={{ height:220, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
                <div style={{ width:40,height:40,borderRadius:'50%',background:'rgba(16,185,129,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>✅</div>
                <p style={{ color:C.completed, fontWeight:700, fontSize:13 }}>No bottlenecks found</p>
                <p style={{ color:C.muted, fontSize:12 }}>All phases are progressing well</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bottlenecksData} layout="vertical" margin={{ left:10, right:28, top:4, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-bg-muted,#f1f5f9)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={90} tickLine={false} axisLine={false} tick={{ fontSize:11, fill:C.muted }} interval={0} />
                  <Tooltip content={<CustomTooltip />} formatter={v=>[v,'Blocked']} />
                  <Bar dataKey="blocked" fill={C.danger} radius={[0,6,6,0]} barSize={14}>
                    <LabelList dataKey="blocked" position="right" style={{ fontSize:11, fill:C.muted }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SCard>
        </Col>
      </Row>

      {/* ── Row 4: At-Risk + Recent Activity ── */}
      <Row>
        <Col flex={5} min={280}>
          <SCard title="⚠ At-Risk Projects">
            {atRiskProjects.length === 0 ? (
              <div style={{ minHeight:180, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
                <div style={{ width:40,height:40,borderRadius:'50%',background:'rgba(16,185,129,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🎯</div>
                <p style={{ color:C.completed, fontWeight:700, fontSize:13 }}>All projects on track</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {atRiskProjects.map((p,i) => (
                  <div key={i} style={{ display:'flex', flexDirection:'column', gap:6, padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontWeight:600, fontSize:13, color:C.text }}>{p.name}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:p.diff<0?C.danger:C.pending, background:p.diff<0?'#fef2f2':'#fffbeb', borderRadius:6, padding:'2px 8px' }}>
                        {p.diff<0 ? `${Math.abs(p.diff)}d overdue` : `${p.diff}d left`}
                      </span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <ProgressBar pct={p.pct} color={p.pct>50?C.inProgress:C.danger} />
                      <span style={{ fontSize:11, fontWeight:700, color:C.muted, minWidth:28 }}>{p.pct}%</span>
                    </div>
                    <p style={{ margin:0, fontSize:11, color:C.muted }}>Deadline: {p.end_date||'—'} · <StatusBadge status={p.status} /></p>
                  </div>
                ))}
              </div>
            )}
          </SCard>
        </Col>
        <Col flex={5} min={280}>
          <SCard title="🕐 Recent Activity">
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {recentTasks.length === 0 && <p style={{ color:C.muted, fontSize:13, textAlign:'center', padding:'20px 0' }}>No recent tasks.</p>}
              {recentTasks.map(t => (
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #f8fafc' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontWeight:600, fontSize:13, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.task_title||'Untitled'}</p>
                    <p style={{ margin:'2px 0 0', fontSize:11, color:C.muted }}>{app.projectName(t.project_id)||'No Project'}</p>
                  </div>
                  <StatusBadge status={t.status} />
                  <span style={{ fontSize:11, color:C.subtle, flexShrink:0, minWidth:60, textAlign:'right' }}>{t.date}</span>
                </div>
              ))}
            </div>
          </SCard>
        </Col>
      </Row>

      {/* ── Row 5: Client-wise Teams ── */}
      <SCard title="👥 Client-wise Teams" style={{ marginBottom:20 }}>
        <ClientTeamsPanel />
      </SCard>

      {/* ── Row 6: Document Flow Health ── */}
      <SCard title="📄 Document Flow Health">
        {loadingDoc ? (
          <div style={{ display:'flex', justifyContent:'center', padding:24 }}>
            <div style={{ width:28,height:28, borderRadius:'50%', border:'3px solid #e2e8f0', borderTop:`3px solid #6366f1`, animation:'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : !docHealth.length ? (
          <p style={{ color:C.muted, textAlign:'center', padding:20, fontSize:13 }}>No document flow data.</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
            {docHealth.map(({ project, rows }) => {
              const total = rows.length || 9;
              const done  = rows.filter(r => r.status==='Completed').length;
              const pct   = total ? Math.round((done/total)*100) : 0;
              return (
                <div key={project.id} style={{
                  border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px',
                  background: pct===100?'rgba(16,185,129,0.08)':'var(--theme-surface-muted,#fafafa)',
                  transition:'transform .18s',
                }}>
                  <p style={{ margin:'0 0 8px', fontWeight:700, fontSize:13, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{project.name}</p>
                  <div style={{ display:'flex', gap:4, marginBottom:8, flexWrap:'wrap' }}>
                    {(rows.length ? rows : Array.from({length:9})).map((r,i) => {
                      const st = r?.status || 'Not Started';
                      const cl = st==='Completed'?C.completed:st==='In Progress'?C.inProgress:st==='Waiting for Client'?C.pending:'var(--card-border,#e2e8f0)';
                      return <div key={i} title={st} style={{ width:13,height:13,borderRadius:'50%',background:cl }} />;
                    })}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <ProgressBar pct={pct} color={pct===100?C.completed:C.inProgress} />
                    <span style={{ fontSize:11,fontWeight:700,color:C.muted,minWidth:28 }}>{pct}%</span>
                  </div>
                  <p style={{ margin:'4px 0 0', fontSize:11, color:C.muted }}>{done}/{total} complete</p>
                </div>
              );
            })}
          </div>
        )}
      </SCard>

    </div>
  );
}

