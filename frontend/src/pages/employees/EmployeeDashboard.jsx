import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, AlertTriangle, Bell, Briefcase, Calendar,
  CheckCircle, ChevronLeft, ChevronRight, Clock,
  CreditCard, FileText, LogIn, LogOut, MapPin,
  Megaphone, Receipt, TrendingUp, User, Zap,
  CalendarCheck, X, ExternalLink,
} from 'lucide-react';
import { attendanceAPI, getIndiaDate } from '../../services/attendanceAPI';
import { employeeAPI } from '../../services/employeeAPI';
import { expenseAPI } from '../../services/expenseAPI';
import { leaveAPI } from '../../services/leaveAPI';
import { projectAPI } from '../../services/projectAPI';
import { resignationAPI } from '../../services/resignationAPI';
import api from '../../services/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

/* ─── helpers ─────────────────────────────────────────────────── */
const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const pct = (v) => `${Math.round(v || 0)}%`;
const safe = (r, keys) => {
  if (!r || r.status !== 'fulfilled') return null;
  let v = r.value?.data;
  for (const k of keys) v = v?.[k];
  return v ?? null;
};
const safeArr = (r, keys) => {
  const v = safe(r, keys);
  return Array.isArray(v) ? v : [];
};

const formatTime = (val) => {
  if (!val) return '--';
  let d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  d = new Date(`2000-01-01T${val}`);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return val;
};

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES    = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const STATUS_COLOR = {
  Present: '#10b981', Delayed: '#f59e0b', 'Half Day': '#6366f1',
  Absent: '#ef4444', 'On Leave': '#8b5cf6', Pending: '#64748b',
};
const LEAVE_COLORS = ['#5B4FF7','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

/* ─── CSS variables helper ────────────────────────────────────── */
const T = {
  strong: { color: 'var(--theme-text-strong, #0f172a)' },
  muted:  { color: 'var(--theme-text-muted, #64748b)'  },
  base:   { color: 'var(--theme-text, #334155)'         },
};

const cardBase = (extra = {}) => ({
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--card-border, #e2e8f0)',
  boxShadow: 'var(--card-shadow, 0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04))',
  borderRadius: 16,
  ...extra,
});

/* ─── Custom chart tooltip ────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--card-bg,#fff)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 16px rgba(0,0,0,.1)' }}>
      <p style={{ ...T.muted, margin:'0 0 6px', fontWeight:600 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, margin:'2px 0', fontWeight:700 }}>
          {p.name}: {typeof p.value==='number' && p.name?.includes('Salary') ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── KPI stat card ───────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, color, gradient, onClick }) => (
  <div
    onClick={onClick}
    style={{
      ...cardBase(),
      background: gradient || 'var(--card-bg, #fff)',
      border: gradient ? 'none' : '1px solid var(--card-border, #e2e8f0)',
      boxShadow: gradient ? `0 6px 24px ${color}30` : 'var(--card-shadow)',
      padding: '18px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0,
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: onClick ? 'pointer' : 'default',
    }}
    onMouseOver={e => { if (onClick) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 28px ${color}28`; } }}
    onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=gradient?`0 6px 24px ${color}30`:'var(--card-shadow)'; }}
  >
    <div style={{ width:46, height:46, borderRadius:13, background: gradient ? 'rgba(255,255,255,0.2)' : color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <Icon size={20} style={{ color: gradient ? '#fff' : color }} strokeWidth={2} />
    </div>
    <div style={{ minWidth:0, flex:1 }}>
      <p style={{ margin:0, fontSize:10.5, color:gradient?'rgba(255,255,255,0.75)':'var(--theme-text-muted,#64748b)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</p>
      <p style={{ margin:'4px 0 2px', fontSize:22, fontWeight:800, color:gradient?'#fff':'var(--theme-text-strong,#0f172a)', lineHeight:1.15 }}>{value}</p>
      {sub && <p style={{ margin:0, fontSize:11, color:gradient?'rgba(255,255,255,0.65)':'var(--theme-text-muted,#94a3b8)' }}>{sub}</p>}
    </div>
  </div>
);

/* ─── Section card ────────────────────────────────────────────── */
const Card = ({ title, children, style: s = {}, action, icon: Icon }) => (
  <div style={{ ...cardBase({ padding:'20px 22px' }), ...s }}>
    {title && (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {Icon && <div style={{ width:28, height:28, borderRadius:8, background:'var(--color-primary-soft,#f0eeff)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={14} style={{ color:'var(--color-primary,#5B4FF7)' }} /></div>}
          <h3 style={{ margin:0, fontSize:13.5, fontWeight:700, ...T.strong, letterSpacing:'-0.2px' }}>{title}</h3>
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

/* ─── Premium Check-In / Check-Out Widget ─────────────────────── */
const AttendanceWidget = ({ today, clock, checkingIn, onAttendance, profile, user }) => {
  const checkedIn   = !!today?.check_in;
  const checkedOut  = !!today?.check_out;
  const checkInTime = today?.check_in_time  || today?.check_in  || null;
  const checkOutTime= today?.check_out_time || today?.check_out || null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const statusLabel = checkedOut ? 'Completed' : checkedIn ? 'In Progress' : 'Not Started';
  const statusColor = checkedOut ? '#10b981' : checkedIn ? '#f59e0b' : '#94a3b8';

  const getWorkDuration = () => {
    if (today?.worked_hours) return `${today.worked_hours}h`;
    if (checkedIn && checkInTime) {
      const inTime = new Date(checkInTime);
      if (!isNaN(inTime)) {
        const diff = Math.floor((Date.now() - inTime.getTime()) / 60000);
        const h = Math.floor(diff / 60), m = diff % 60;
        return `${h}h ${m}m`;
      }
    }
    return '--';
  };

  return (
    <div style={{
      ...cardBase(),
      padding: 0,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header gradient */}
      <div style={{
        background: checkedOut
          ? 'linear-gradient(135deg, #059669, #10b981)'
          : checkedIn
          ? 'linear-gradient(135deg, #d97706, #f59e0b)'
          : 'linear-gradient(135deg, #5B4FF7, #7b6ef9)',
        padding: '20px 22px 18px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }} />
        <div style={{ position:'absolute', bottom:-30, right:30, width:70, height:70, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', position:'relative' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <MapPin size={12} style={{ color:'rgba(255,255,255,0.7)' }} />
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:500 }}>Work Desk HRMS</span>
            </div>
            <p style={{ margin:0, fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-1px', fontVariantNumeric:'tabular-nums' }}>{clock}</p>
            <p style={{ margin:'3px 0 0', fontSize:11.5, color:'rgba(255,255,255,0.72)', fontWeight:500 }}>{dateStr}</p>
          </div>
          <div style={{ textAlign:'right' }}>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:5,
              background:'rgba(255,255,255,0.15)', borderRadius:20,
              padding:'4px 12px', fontSize:11, fontWeight:700, color:'#fff',
            }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:checkedOut?'#fff':checkedIn?'#fde68a':'rgba(255,255,255,0.5)', display:'inline-block' }} />
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Time entries */}
      <div style={{ padding:'16px 22px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
          {[
            { label:'Check In',     value:formatTime(checkInTime),  icon:LogIn,   color:'#10b981', ok:checkedIn  },
            { label:'Check Out',    value:formatTime(checkOutTime), icon:LogOut,  color:'#ef4444', ok:checkedOut },
            { label:'Work Duration',value:getWorkDuration(),        icon:Clock,   color:'#5B4FF7', ok:checkedIn  },
          ].map(({ label, value, icon: Icon, color, ok }) => (
            <div key={label} style={{
              background:'var(--theme-surface-muted,#f8fafc)',
              borderRadius:10, padding:'10px 12px',
              border:'1px solid var(--card-border,#e2e8f0)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                <Icon size={12} style={{ color: ok ? color : 'var(--theme-text-subtle,#94a3b8)' }} />
                <span style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--theme-text-muted,#64748b)' }}>{label}</span>
              </div>
              <p style={{ margin:0, fontSize:14, fontWeight:800, color: ok ? 'var(--theme-text-strong,#0f172a)' : 'var(--theme-text-subtle,#94a3b8)', fontVariantNumeric:'tabular-nums' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Status bar */}
        {today?.status && (
          <div style={{
            display:'flex', alignItems:'center', gap:8, marginBottom:14,
            padding:'8px 12px', borderRadius:8,
            background: STATUS_COLOR[today.status] ? STATUS_COLOR[today.status]+'12' : 'var(--theme-surface-muted,#f8fafc)',
            border:`1px solid ${STATUS_COLOR[today.status] || '#e2e8f0'}30`,
          }}>
            <Activity size={13} style={{ color: STATUS_COLOR[today.status] || '#64748b' }} />
            <span style={{ fontSize:12, fontWeight:700, color: STATUS_COLOR[today.status] || '#64748b' }}>
              Today: {today.status}
            </span>
          </div>
        )}
      </div>

      {/* Action button */}
      <div style={{ padding:'0 22px 20px' }}>
        <button
          onClick={onAttendance}
          disabled={checkingIn || checkedOut}
          style={{
            width:'100%', padding:'13px', borderRadius:12, border:'none',
            cursor: checkedOut ? 'default' : 'pointer',
            fontWeight:700, fontSize:14, letterSpacing:'0.01em',
            background: checkedOut
              ? '#ECFDF5'
              : checkedIn
              ? 'linear-gradient(135deg,#ef4444,#f97316)'
              : 'linear-gradient(135deg,#5B4FF7,#7b6ef9)',
            color: checkedOut ? '#065f46' : '#fff',
            boxShadow: checkedOut ? 'none' : '0 4px 16px rgba(91,79,247,.35)',
            transition:'all .18s',
            display:'flex', alignItems:'center', justifyContent:'center', gap:9,
          }}
        >
          {checkingIn ? (
            <>
              <div style={{ width:16, height:16, border:'2.5px solid rgba(255,255,255,0.3)', borderTop:'2.5px solid #fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
              Processing...
            </>
          ) : checkedOut ? (
            <><CheckCircle size={16} /> Day Complete — See you tomorrow!</>
          ) : checkedIn ? (
            <><LogOut size={16} /> Check Out</>
          ) : (
            <><LogIn size={16} /> Check In</>
          )}
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

/* ─── Mini Attendance Calendar ────────────────────────────────── */
const AttendanceCalendar = ({ history }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstWeekDay = new Date(year, month, 1).getDay();

  const attMap = {};
  history.forEach(r => {
    if (r.date) attMap[r.date.split('T')[0]] = r.status;
  });

  const getStatus  = (day) => attMap[`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`] || null;
  const isToday    = (day) => today.getDate()===day && today.getMonth()===month && today.getFullYear()===year;
  const isFuture   = (day) => new Date(year,month,day) > today;
  const canGoNext  = !(year===today.getFullYear() && month===today.getMonth());

  const cells = [...Array(firstWeekDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <button
          onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}
          style={{ background:'var(--theme-surface-muted,#f8fafc)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:6, cursor:'pointer', padding:'3px 7px', ...T.muted, display:'flex', alignItems:'center' }}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize:13, fontWeight:700, ...T.strong }}>{MONTHS_SHORT[month]} {year}</span>
        <button
          onClick={() => canGoNext && setViewDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}
          disabled={!canGoNext}
          style={{ background:'var(--theme-surface-muted,#f8fafc)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:6, cursor:canGoNext?'pointer':'default', padding:'3px 7px', ...T.muted, display:'flex', alignItems:'center', opacity:canGoNext?1:.35 }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2, marginBottom:6 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:9.5, fontWeight:700, color:'var(--theme-text-muted,#94a3b8)', paddingBottom:2 }}>{d}</div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:3 }}>
        {cells.map((day,i) => {
          if (!day) return <div key={`_${i}`} />;
          const st     = getStatus(day);
          const clr    = st ? STATUS_COLOR[st] : null;
          const today_ = isToday(day);
          const future = isFuture(day);
          return (
            <div key={day} title={st||''} style={{
              aspectRatio:'1/1', maxWidth:26, margin:'0 auto',
              borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:today_?800:500,
              background: clr ? clr+'22' : (today_ && !clr ? 'var(--color-primary,#5B4FF7)' : 'transparent'),
              color: clr ? clr : (today_ && !clr ? '#fff' : (future ? 'var(--theme-text-muted,#94a3b8)' : 'var(--theme-text,#334155)')),
              border: today_ && !clr ? '2px solid var(--color-primary,#5B4FF7)' : clr ? `1.5px solid ${clr}44` : '1.5px solid transparent',
              opacity: future ? 0.4 : 1,
              cursor: 'default',
              width: '100%',
            }}>{day}</div>
          );
        })}
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10, paddingTop:10, borderTop:'1px solid var(--card-border,#e2e8f0)' }}>
        {[['Present','#10b981'],['Absent','#ef4444'],['Leave','#8b5cf6'],['Late','#f59e0b']].map(([l,c]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:c, flexShrink:0 }} />
            <span style={{ fontSize:10, ...T.muted }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Leave progress bar ──────────────────────────────────────── */
const LeaveBar = ({ name, used, total, color }) => {
  const pctVal = total > 0 ? Math.min(100, Math.round((used/total)*100)) : 0;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:12.5, fontWeight:600, ...T.base }}>{name}</span>
        <span style={{ fontSize:11.5, fontWeight:700, color }}>
          {Math.max(0, total-used)}d <span style={{ fontWeight:400, ...T.muted }}>/ {total}d</span>
        </span>
      </div>
      <div style={{ height:6, borderRadius:999, background:'var(--theme-border,#e2e8f0)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pctVal}%`, background:color, borderRadius:999, transition:'width .45s ease' }} />
      </div>
    </div>
  );
};

/* ─── Quick action button ─────────────────────────────────────── */
const QuickAction = ({ label, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:8,
      padding:'16px 12px', borderRadius:14,
      border:`1.5px solid ${color}20`,
      background:`${color}0a`,
      cursor:'pointer', fontWeight:600, fontSize:12, color,
      transition:'all .15s', flex:1, minWidth:80, maxWidth:130,
    }}
    onMouseOver={e => { e.currentTarget.style.background=`${color}18`; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 6px 18px ${color}22`; }}
    onMouseOut={e  => { e.currentTarget.style.background=`${color}0a`; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
  >
    <div style={{ width:40, height:40, borderRadius:12, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Icon size={18} style={{ color }} strokeWidth={2} />
    </div>
    {label}
  </button>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const EmployeeDashboard = ({ user: propUser, navigateToTab }) => {
  const user = propUser || JSON.parse(localStorage.getItem('user') || '{}');

  const [loading,       setLoading]       = useState(true);
  const [profile,       setProfile]       = useState(null);
  const [today,         setToday]         = useState(null);
  const [history,       setHistory]       = useState([]);
  const [leaves,        setLeaves]        = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [expenses,      setExpenses]      = useState([]);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnn,   setSelectedAnn]   = useState(null);
  const [readIds,       setReadIds]       = useState(new Set());
  const [projectCount,  setProjectCount]  = useState(0);
  const [checkingIn,    setCheckingIn]    = useState(false);
  const [myResignation, setMyResignation] = useState(null);

  const clockRef = useRef(null);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true, timeZone:'Asia/Kolkata' }));
    tick();
    clockRef.current = setInterval(tick, 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  const markRead = async (ann) => {
    if (readIds.has(ann.id)) return;
    setReadIds(prev => new Set([...prev, ann.id]));
    try { await api.post(`/announcements/${ann.id}/read`); } catch { /* non-fatal */ }
  };

  const load = useCallback(async () => {
    setLoading(true);
    let empDetailId = null;
    try {
      const pr = await employeeAPI.getMyProfile();
      const emp = pr.data?.employee;
      empDetailId = emp?.employee_id;
      if (emp) setProfile(emp);
    } catch (_) {}

    const [todayR, histR, leavesR, balR, expR, salR, annR, projR] = await Promise.allSettled([
      attendanceAPI.getMyTodayAttendance(),
      attendanceAPI.getMyHistory(),
      leaveAPI.getMyLeaves(),
      leaveAPI.getMyBalances(),
      expenseAPI.getMyExpenses ? expenseAPI.getMyExpenses() : api.get('/expenses/my'),
      api.get('/salary/my-history'),
      api.get('/announcements/active'),
      projectAPI.getMyProjects(),
    ]);

    setToday(safe(todayR, ['attendance']) || safe(todayR, ['record']));
    const histArr = safeArr(histR, ['history']);
    setHistory((histArr.length ? histArr : safeArr(histR, ['attendance'])).slice(-60));
    setLeaves(safeArr(leavesR, ['leaves']));
    const balArr = safeArr(balR, ['balances']);
    setLeaveBalances(balArr.length ? balArr : safeArr(balR, ['data']));
    const expArr = safeArr(expR, ['expenses']);
    setExpenses(expArr.length ? expArr : safeArr(expR, ['data']));
    const salArr = safeArr(salR, ['history']);
    setSalaryHistory((salArr.length ? salArr : safeArr(salR, ['data'])).slice(-6));
    const annList = (safeArr(annR, ['data']) || []).slice(0, 5);
    setAnnouncements(annList);
    setReadIds(new Set(annList.filter(a => a.is_read).map(a => a.id)));
    const projArr = projR?.status === 'fulfilled' ? (projR.value?.data?.projects || projR.value?.data?.data || []) : [];
    setProjectCount(Array.isArray(projArr) ? projArr.length : 0);

    try {
      const resR = await resignationAPI.getMyRequests();
      const resList = resR.data?.data || [];
      const activeRes = resList.find(r => ['pending','under_review','approved'].includes(r.status)) || resList[0] || null;
      setMyResignation(activeRes);
    } catch (_) {}

    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  /* ─── Derived ─────────────────────────────────────────────── */
  const RES_LABEL = { pending:'Pending', under_review:'Under Review', approved:'Approved', rejected:'Rejected', withdrawn:'Withdrawn' };
  const RES_COLOR = { pending:'#b45309', under_review:'#1d4ed8', approved:'#15803d', rejected:'#b91c1c', withdrawn:'#6b7280' };
  const fmtDash = (d) => d ? new Date(d).toLocaleDateString('en-GB') : null;

  const attendanceDays  = history.filter(r => ['Present','Delayed','Half Day'].includes(r.status)).length;
  const totalDays       = history.filter(r => r.status !== 'Pending').length || 1;
  const attendancePct   = Math.round((attendanceDays / totalDays) * 100);
  const pendingLeaves   = leaves.filter(l => l.status === 'Pending').length;
  const approvedLeaves  = leaves.filter(l => l.status === 'Approved').length;
  const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
  const latestSalary    = salaryHistory[salaryHistory.length - 1];

  const attendanceTrend = history.slice(-14).map(r => ({
    date:    new Date(r.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }),
    Present: ['Present','Delayed','Half Day'].includes(r.status) ? 1 : 0,
    status:  r.status,
  }));

  const thisMonthStatus = history.filter(r => {
    const d = new Date(r.date); const n = new Date();
    return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
  }).reduce((acc,r) => { acc[r.status]=(acc[r.status]||0)+1; return acc; }, {});

  const leaveProgressData = leaveBalances.length
    ? leaveBalances.map((b,i) => ({
        name:  b.leave_type || b.name || `Leave ${i+1}`,
        used:  Number(b.used || 0),
        total: Number(b.total || b.allowed || (Number(b.remaining||b.balance||0)+Number(b.used||0)) || 10),
        color: LEAVE_COLORS[i % LEAVE_COLORS.length],
      }))
    : [
        { name:'Earned Leave', used:3, total:15, color:'#5B4FF7' },
        { name:'Casual Leave', used:2, total:8,  color:'#10b981' },
        { name:'Sick Leave',   used:1, total:6,  color:'#f59e0b' },
      ];

  const salaryChart = salaryHistory.map(s => ({
    month: `${MONTHS_SHORT[(s.month_number||1)-1]} ${String(s.year).slice(-2)}`,
    Gross: Number(s.gross_salary) || 0,
    Net:   Number(s.net_salary)   || 0,
  }));

  const handleAttendance = async () => {
    setCheckingIn(true);
    try {
      await attendanceAPI.markMyAttendance({
        date:   getIndiaDate(),
        status: today?.check_in ? 'checkout' : 'checkin',
        type:   today?.check_in ? 'check_out' : 'check_in',
      });
      await load();
    } catch (_) {}
    setCheckingIn(false);
  };

  const todayCheckedIn   = !!today?.check_in;
  const todayCheckedOut  = !!today?.check_out;
  const isForgotCheckout = todayCheckedIn && !todayCheckedOut && new Date().getHours() >= 18;

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const initials  = `${user.first_name?.[0]||''}${user.last_name?.[0]||''}`.toUpperCase() || 'ME';
  const photoUrl  = profile?.profile_photo ? `${API_BASE}/${profile.profile_photo.replace(/^\//, '')}?token=${encodeURIComponent(localStorage.getItem('token')||'')}` : null;
  const dept      = profile?.department_name || user.department_name || null;
  const empId     = profile?.employee_id || profile?.id || null;

  /* ─── Loading ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh', flexDirection:'column', gap:14 }}>
        <div style={{ width:44, height:44, border:'3px solid var(--card-border,#e2e8f0)', borderTop:'3px solid var(--color-primary,#5B4FF7)', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
        <p style={{ ...T.muted, fontSize:14, fontWeight:500 }}>Loading your dashboard...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <div style={{ padding:'20px 24px 32px', minHeight:'100%', fontFamily:'Inter,system-ui,sans-serif' }}>

      {/* ── Forgot checkout warning ── */}
      {isForgotCheckout && (
        <div className="emp-forgot-checkout-banner" style={{
          background:'var(--color-warning-soft,#fffbeb)',
          border:'1px solid var(--color-warning-border,rgba(245,158,11,.35))',
          borderLeft:'4px solid var(--color-warning,#f59e0b)',
          borderRadius:12, padding:'12px 18px', marginBottom:18,
          display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
        }}>
          <AlertTriangle size={20} style={{ color:'var(--color-warning,#f59e0b)', flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--color-warning-text,#92400e)' }}>Forgot to Check Out?</p>
            <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--color-warning-text,#b45309)' }}>You checked in today but haven&apos;t checked out. Your attendance may be marked incomplete.</p>
          </div>
          <button onClick={handleAttendance} disabled={checkingIn} className="btn-warning btn-sm">
            <LogOut size={13} /> Check Out Now
          </button>
        </div>
      )}

      {/* ── Hero header ── */}
      <div style={{
        ...cardBase(),
        background:'linear-gradient(135deg, var(--color-primary,#5B4FF7) 0%, #7b6ef9 60%, #3B82F6 100%)',
        border:'none', padding:'22px 26px', marginBottom:18, position:'relative', overflow:'hidden',
      }}>
        {/* Decorative */}
        <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
        <div style={{ position:'absolute', bottom:-20, right:100, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14, position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{
              width:56, height:56, borderRadius:16, overflow:'hidden',
              background:'rgba(255,255,255,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:800, fontSize:20, flexShrink:0,
              border:'2px solid rgba(255,255,255,0.3)',
            }}>
              {photoUrl
                ? <img src={photoUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : initials}
            </div>
            <div>
              <p style={{ margin:0, fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em' }}>{greet()},</p>
              <h1 style={{ margin:'2px 0', fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-0.5px', lineHeight:1.2 }}>
                {user.first_name} {user.last_name}
              </h1>
              <p style={{ margin:0, fontSize:12, color:'rgba(255,255,255,0.72)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                {(profile?.position||user.position) ? (profile?.position||user.position).charAt(0).toUpperCase()+(profile?.position||user.position).slice(1) : 'Employee'}
                {dept && <><span style={{ opacity:.5 }}>·</span>{dept}</>}
                {empId && <><span style={{ opacity:.5 }}>·</span><span style={{ fontWeight:800, color:'#c7d2fe' }}>#{empId}</span></>}
              </p>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)', borderRadius:12, padding:'10px 16px', textAlign:'center', border:'1px solid rgba(255,255,255,0.2)' }}>
              <p style={{ margin:0, fontSize:18, fontWeight:800, color:'#fff', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.5px' }}>{clock}</p>
              <p style={{ margin:0, fontSize:9.5, color:'rgba(255,255,255,0.65)', textTransform:'uppercase', letterSpacing:'.08em' }}>IST</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:18 }}>
        <StatCard icon={CalendarCheck} label="Attendance" value={pct(attendancePct)} sub={`${attendanceDays} of ${totalDays} days`} color="#10b981" gradient="linear-gradient(135deg,#059669,#10b981)" />
        <StatCard icon={Calendar}      label="Pending Leaves" value={pendingLeaves} sub={`${approvedLeaves} approved`} color="#5B4FF7" onClick={() => navigateToTab?.('employee-leave')} />
        <StatCard icon={CreditCard}    label="Last Net Salary" value={latestSalary?fmt(latestSalary.net_salary):'—'} sub={latestSalary?`${MONTHS_SHORT[(latestSalary.month_number||1)-1]} ${latestSalary.year}`:'No records'} color="#f59e0b" onClick={() => navigateToTab?.('employee-payslips')} />
        <StatCard icon={Briefcase}     label="My Projects" value={projectCount} sub="Assigned projects" color="#0ea5e9" onClick={() => navigateToTab?.('employee-projects')} />
        <StatCard icon={Receipt}       label="Pending Expenses" value={pendingExpenses} sub={`${expenses.length} total`} color="#ef4444" onClick={() => navigateToTab?.('employee-expense')} />
        {myResignation ? (
          <StatCard icon={FileText} label="My Resignation" value={RES_LABEL[myResignation.status]||myResignation.status} sub={fmtDash(myResignation.revised_last_working_date || myResignation.original_last_working_date) ? `LWD: ${fmtDash(myResignation.revised_last_working_date || myResignation.original_last_working_date)}` : myResignation.ref_number} color={RES_COLOR[myResignation.status]||'#6b7280'} onClick={() => navigateToTab?.('employee-resignation')} />
        ) : (
          <StatCard icon={FileText} label="My Resignation" value="None" sub="No active request" color="#8b5cf6" onClick={() => navigateToTab?.('employee-resignation')} />
        )}
      </div>

      {/* ── Attendance widget + chart ── */}
      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:14, marginBottom:14 }}>
        <AttendanceWidget
          today={today}
          clock={clock}
          checkingIn={checkingIn}
          onAttendance={handleAttendance}
          profile={profile}
          user={user}
        />

        <Card title="Attendance Trend — Last 14 Days" icon={TrendingUp} action={
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {Object.entries(thisMonthStatus).slice(0,3).map(([st,cnt]) => (
              <span key={st} style={{ background:(STATUS_COLOR[st]||'#5B4FF7')+'15', color:STATUS_COLOR[st]||'#5B4FF7', borderRadius:6, padding:'2px 9px', fontSize:10, fontWeight:700 }}>
                {st}: {cnt}
              </span>
            ))}
          </div>
        }>
          {attendanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={attendanceTrend} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#5B4FF7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#5B4FF7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border,#f1f5f9)" />
                <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--theme-text-muted,#94a3b8)' }} />
                <YAxis tick={{ fontSize:10, fill:'var(--theme-text-muted,#94a3b8)' }} domain={[0,1]} ticks={[0,1]} tickFormatter={v=>v?'P':'A'} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Present" stroke="#5B4FF7" fill="url(#attGrad)" strokeWidth={2.5} dot={{ fill:'#5B4FF7', r:3, strokeWidth:0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign:'center', padding:60, ...T.muted, fontSize:13 }}>
              <Activity size={32} style={{ opacity:.25, marginBottom:8 }} />
              <p style={{ margin:0 }}>No attendance data yet</p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Calendar + Leave balance ── */}
      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:14, marginBottom:14 }}>
        <Card title="Monthly View" icon={Calendar}>
          <AttendanceCalendar history={history} />
        </Card>

        <Card title="Leave Balance" icon={CalendarCheck} action={
          <button onClick={() => navigateToTab?.('employee-leave')} style={{ background:'var(--color-primary-soft,#f0eeff)', border:'none', borderRadius:8, padding:'5px 12px', fontSize:11.5, color:'var(--color-primary,#5B4FF7)', fontWeight:700, cursor:'pointer' }}>
            Apply →
          </button>
        }>
          {leaveProgressData.map((item,i) => (
            <LeaveBar key={i} name={item.name} used={item.used} total={item.total} color={item.color} />
          ))}
        </Card>
      </div>

      {/* ── Quick Actions ── */}
      <Card title="Quick Actions" icon={Zap} style={{ marginBottom:14 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <QuickAction label="Apply Leave"    icon={Calendar}      color="#5B4FF7" onClick={() => navigateToTab?.('employee-leave')} />
          <QuickAction label="Add Expense"    icon={Receipt}       color="#f59e0b" onClick={() => navigateToTab?.('employee-expense')} />
          <QuickAction label="View Payslips"  icon={CreditCard}    color="#10b981" onClick={() => navigateToTab?.('employee-payslips')} />
          <QuickAction label="Attendance"     icon={CalendarCheck} color="#8b5cf6" onClick={() => navigateToTab?.('employee-attendance')} />
          <QuickAction label="Work Report"    icon={FileText}      color="#0ea5e9" onClick={() => navigateToTab?.('employee-work-report')} />
          <QuickAction label="My Profile"     icon={User}          color="#06b6d4" onClick={() => navigateToTab?.('personal-info')} />
        </div>
      </Card>

      {/* ── Salary trend + Recent leaves ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>

        {salaryChart.length > 0 ? (
          <Card title="Salary — Last 6 Months" icon={TrendingUp} action={
            <button onClick={() => navigateToTab?.('employee-payslips')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--color-primary,#5B4FF7)', fontWeight:700, padding:0 }}>
              View Payslips →
            </button>
          }>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={salaryChart} margin={{ top:4, right:4, bottom:0, left:10 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border,#f1f5f9)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize:10.5, fill:'var(--theme-text-muted,#94a3b8)' }} />
                <YAxis tick={{ fontSize:10, fill:'var(--theme-text-muted,#94a3b8)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:11 }} />
                <Bar dataKey="Gross" fill="#a5b4fc" radius={[4,4,0,0]} />
                <Bar dataKey="Net"   fill="#5B4FF7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card title="Payslips" icon={CreditCard}>
            <div style={{ textAlign:'center', padding:'28px 0' }}>
              <CreditCard size={40} style={{ opacity:.2, marginBottom:10 }} />
              <p style={{ ...T.muted, fontSize:13, marginBottom:14 }}>No salary records found</p>
              <button className="btn-primary" onClick={() => navigateToTab?.('employee-payslips')}>
                View Payslips
              </button>
            </div>
          </Card>
        )}

        <Card title="My Recent Leaves" icon={Calendar} action={
          <button onClick={() => navigateToTab?.('employee-leave')} style={{ background:'var(--color-primary-soft,#f0eeff)', border:'none', borderRadius:8, padding:'5px 12px', fontSize:11.5, color:'var(--color-primary,#5B4FF7)', fontWeight:700, cursor:'pointer' }}>
            View All
          </button>
        }>
          {leaves.length === 0 ? (
            <div style={{ textAlign:'center', ...T.muted, fontSize:13, padding:'20px 0' }}>
              <Calendar size={28} style={{ opacity:.2, marginBottom:8 }} />
              <p style={{ margin:0 }}>No leave requests yet</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {leaves.slice(0,5).map((l,i) => {
                const sc = l.status==='Approved'?'#10b981':l.status==='Rejected'?'#ef4444':'#f59e0b';
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', background:'var(--theme-surface-muted,#f8fafc)', borderRadius:10, border:'1px solid var(--card-border,#f1f5f9)' }}>
                    <div>
                      <p style={{ margin:0, fontSize:13, fontWeight:600, ...T.strong }}>{l.leave_type}</p>
                      <p style={{ margin:'2px 0 0', fontSize:11, ...T.muted }}>
                        {new Date(l.start_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} → {new Date(l.end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                      </p>
                    </div>
                    <span style={{ background:sc+'18', color:sc, borderRadius:6, padding:'3px 9px', fontSize:11, fontWeight:700 }}>{l.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Announcements ── */}
      {(() => {
        const unreadCount = announcements.filter(a => !readIds.has(a.id)).length;
        return (
          <Card title="Announcements" icon={Megaphone} action={
            unreadCount > 0
              ? <span style={{ background:'#dc2626', color:'#fff', borderRadius:999, padding:'2px 9px', fontSize:11, fontWeight:700 }}>{unreadCount} unread</span>
              : announcements.length > 0
                ? <span className="ann-all-read-badge" style={{ background:'#d1fae5', color:'#065f46', borderRadius:999, padding:'2px 9px', fontSize:11, fontWeight:700 }}>All read</span>
                : null
          }>
            {announcements.length === 0 ? (
              <div style={{ textAlign:'center', padding:'22px 0' }}>
                <Bell size={30} style={{ opacity:.2, marginBottom:8 }} />
                <p style={{ ...T.muted, fontSize:13 }}>No active announcements</p>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
                {announcements.map((a, i) => {
                  const bc = a.priority==='urgent'?'#dc2626':a.priority==='high'?'#d97706':a.priority==='medium'?'#2563eb':'#059669';
                  const isRead = readIds.has(a.id);
                  return (
                    <div
                      key={i}
                      onClick={() => { setSelectedAnn(a); markRead(a); }}
                      style={{
                        padding:'12px 14px',
                        background: isRead ? 'var(--theme-surface-muted,#f8fafc)' : 'var(--card-bg,#fff)',
                        borderRadius:12,
                        border:`1px solid ${isRead ? 'var(--card-border,#f1f5f9)' : bc+'44'}`,
                        borderLeft:`4px solid ${bc}`,
                        cursor:'pointer', transition:'box-shadow .15s',
                        opacity: isRead ? 0.78 : 1,
                      }}
                      onMouseOver={e => e.currentTarget.style.boxShadow=`0 2px 12px rgba(0,0,0,0.07)`}
                      onMouseOut={e  => e.currentTarget.style.boxShadow='none'}
                    >
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                          {!isRead && <span style={{ width:7, height:7, borderRadius:'50%', background:'#dc2626', flexShrink:0, display:'inline-block' }} />}
                          <p style={{ margin:0, fontSize:12.5, fontWeight: isRead ? 600 : 700, ...T.strong, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</p>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, color:bc, background:bc+'15', borderRadius:5, padding:'2px 7px', flexShrink:0, textTransform:'uppercase' }}>{a.priority||'normal'}</span>
                      </div>
                      <p style={{ margin:'5px 0 0', fontSize:11, ...T.muted, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{a.content}</p>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6 }}>
                        <span style={{ fontSize:10, color:'var(--color-primary,#5B4FF7)', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
                          <ExternalLink size={9} /> Read more
                        </span>
                        {isRead && <span style={{ fontSize:10, color:'#059669', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}><CheckCircle size={9} /> Read</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })()}

      {/* ── Announcement Detail Modal ── */}
      {selectedAnn && (() => {
        const bc = selectedAnn.priority==='urgent'?'#dc2626':selectedAnn.priority==='high'?'#d97706':selectedAnn.priority==='medium'?'#2563eb':'#059669';
        const priLabel = { urgent:'Urgent', high:'High', medium:'Medium', low:'Low' }[selectedAnn.priority] || 'Normal';
        return (
          <div
            onClick={() => setSelectedAnn(null)}
            style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background:'var(--card-bg,#fff)', borderRadius:18, width:560, maxWidth:'95vw', maxHeight:'85vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', border:'1px solid var(--card-border,#e5e7eb)' }}
            >
              <div style={{ padding:'20px 24px 16px', borderBottom:`3px solid ${bc}` }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:bc, background:bc+'18', borderRadius:6, padding:'3px 9px', textTransform:'uppercase', display:'inline-block', marginBottom:8 }}>{priLabel} Priority</span>
                    <h2 style={{ margin:0, fontSize:18, fontWeight:800, ...T.strong, lineHeight:1.3 }}>{selectedAnn.title}</h2>
                  </div>
                  <button onClick={() => setSelectedAnn(null)} style={{ background:'var(--theme-surface-muted,#f1f5f9)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:8, fontSize:16, cursor:'pointer', ...T.muted, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <X size={15} />
                  </button>
                </div>
                <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap' }}>
                  {selectedAnn.audience && <span style={{ fontSize:11, ...T.muted, background:'var(--theme-surface-muted,#f8fafc)', borderRadius:6, padding:'2px 8px' }}>For: {selectedAnn.audience}</span>}
                  {selectedAnn.start_date && <span style={{ fontSize:11, ...T.muted }}>From: {new Date(selectedAnn.start_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>}
                  {selectedAnn.end_date   && <span style={{ fontSize:11, ...T.muted }}>Until: {new Date(selectedAnn.end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>}
                </div>
              </div>
              <div style={{ padding:'20px 24px 24px' }}>
                <p style={{ margin:0, fontSize:14, ...T.base, lineHeight:1.8, whiteSpace:'pre-wrap' }}>{selectedAnn.content}</p>
              </div>
              <div style={{ padding:'0 24px 20px', display:'flex', justifyContent:'flex-end' }}>
                <button onClick={() => setSelectedAnn(null)} className="btn-primary" style={{ minHeight:36 }}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default EmployeeDashboard;
