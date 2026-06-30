import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const TODAY  = new Date();

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { return (new Date(y, m, 1).getDay() + 6) % 7; }
function isoDate(y, m, d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

function fmtTime(t) {
  if (!t) return null;
  // t may be "09:05" (string) or ISO datetime
  if (typeof t === 'string' && t.includes('T')) {
    return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (typeof t === 'string' && /^\d{2}:\d{2}/.test(t)) {
    const [h, min] = t.split(':').map(Number);
    const d = new Date(); d.setHours(h, min, 0);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return t;
}

function fmtHours(h) {
  if (!h) return null;
  const num = parseFloat(h);
  if (isNaN(num)) return null;
  const hrs = Math.floor(num);
  const mins = Math.round((num - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

async function loadMonthData(year, month) {
  const from = isoDate(year, month, 1);
  const to   = isoDate(year, month, getDaysInMonth(year, month));

  const [attRes, leaveRes, wfhRes] = await Promise.allSettled([
    api.get('/attendance/my/history', { params: { from_date: from, to_date: to, limit: 200 } }),
    api.get('/leaves/my', { params: { from_date: from, to_date: to } }),
    api.get('/wfh/my'),
  ]);

  const attData   = attRes.status === 'fulfilled' ? attRes.value.data : null;
  // Backend returns { success, history: [...] }
  const attendance = Array.isArray(attData?.history) ? attData.history
    : Array.isArray(attData?.data) ? attData.data
    : Array.isArray(attData?.attendance) ? attData.attendance
    : Array.isArray(attData) ? attData : [];

  const leaveData = leaveRes.status === 'fulfilled' ? leaveRes.value.data : null;
  const leaves    = Array.isArray(leaveData?.leaves) ? leaveData.leaves
    : Array.isArray(leaveData?.data) ? leaveData.data
    : Array.isArray(leaveData) ? leaveData : [];

  const wfhData = wfhRes.status === 'fulfilled' ? wfhRes.value.data : null;
  const wfhList = Array.isArray(wfhData?.data) ? wfhData.data : [];

  return { attendance, leaves, wfhList };
}

const STATUS_COLOR = {
  Present:  '#22c55e',
  present:  '#22c55e',
  Delayed:  '#f97316',
  delayed:  '#f97316',
  absent:   '#ef4444',
  Absent:   '#ef4444',
  leave:    '#f59e0b',
  wfh:      '#3b82f6',
  half_day: '#f97316',
  'Half Day': '#f97316',
};

function buildDayMap(attendance, leaves, wfhList) {
  const map = {};

  for (const a of attendance) {
    // date field comes as ISO string e.g. "2026-06-25T18:30:00.000Z" — normalize to local date
    let d = a.date;
    if (d && d.includes('T')) {
      // Convert to local YYYY-MM-DD (attendance stored in IST, date shifts with UTC offset)
      const local = new Date(d);
      d = isoDate(local.getFullYear(), local.getMonth(), local.getDate());
    }
    if (!d) continue;
    map[d] = map[d] || { types: [], att: null, leave: null, wfh: null };
    map[d].att = a;
    const s = (a.status || '').toLowerCase();
    map[d].types.push(s === 'present' || s === 'delayed' ? s : 'absent');
  }

  for (const l of leaves) {
    if (!['Approved', 'approved', 'pending'].includes(l.status)) continue;
    const start = new Date(l.start_date || l.from_date);
    const end   = new Date(l.end_date   || l.to_date);
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const d = isoDate(dt.getFullYear(), dt.getMonth(), dt.getDate());
      map[d] = map[d] || { types: [], att: null, leave: null, wfh: null };
      map[d].leave = l;
      if (!map[d].types.some(t => ['present','delayed'].includes(t))) map[d].types.push('leave');
    }
  }

  // Mark WFH approved days
  for (const w of wfhList) {
    if (w.status !== 'approved') continue;
    const start = new Date(w.from_date);
    const end   = new Date(w.to_date);
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const d = isoDate(dt.getFullYear(), dt.getMonth(), dt.getDate());
      map[d] = map[d] || { types: [], att: null, leave: null, wfh: null };
      map[d].wfh = w;
      if (!map[d].types.includes('wfh')) map[d].types.push('wfh');
    }
  }

  return map;
}

const TYPE_DOT = {
  present:  '#22c55e',
  delayed:  '#f97316',
  absent:   '#ef4444',
  leave:    '#f59e0b',
  wfh:      '#3b82f6',
  half_day: '#f97316',
};

function DayCell({ day, year, month, dayData, today, onClick, selected }) {
  const dateStr = isoDate(year, month, day);
  const isToday = dateStr === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const isFuture = dateStr > isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const types   = dayData?.types || [];
  const dots    = [...new Set(types)].slice(0, 3);
  const att     = dayData?.att;

  return (
    <div onClick={() => onClick(day)} style={{
      minHeight: 72,
      borderRadius: 8,
      border: selected ? '2px solid var(--accent-color,#6366f1)' : isToday ? '2px solid var(--accent-color,#6366f1)' : '1px solid var(--border-color)',
      background: selected ? 'rgba(99,102,241,0.07)' : 'var(--card-bg)',
      padding: '6px 7px',
      cursor: 'pointer',
      opacity: isFuture ? 0.5 : 1,
      position: 'relative',
      transition: 'box-shadow 0.15s',
    }}>
      <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent-color,#6366f1)' : 'var(--text-primary)' }}>{day}</div>

      {/* Check-in time in cell */}
      {att?.check_in_time && (
        <div style={{ fontSize: 9, color: '#22c55e', fontWeight: 600, marginTop: 2, lineHeight: 1.2 }}>
          ↑ {fmtTime(att.check_in_time)}
        </div>
      )}
      {att?.check_out_time && (
        <div style={{ fontSize: 9, color: '#ef4444', fontWeight: 600, lineHeight: 1.2 }}>
          ↓ {fmtTime(att.check_out_time)}
        </div>
      )}

      {/* Status dots */}
      <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
        {dots.map(t => <div key={t} style={{ width: 7, height: 7, borderRadius: '50%', background: TYPE_DOT[t] || '#9ca3af' }} />)}
      </div>
    </div>
  );
}

function DayDetail({ day, year, month, dayData }) {
  if (!day) return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20, color: 'var(--text-muted,#9ca3af)', fontSize: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
      <div>Select a day to see details</div>
    </div>
  );

  const dateStr = isoDate(year, month, day);
  const { att, leave, wfh } = dayData || {};
  const statusColor = att ? (STATUS_COLOR[att.status] || '#6b7280') : null;

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 16 }}>
        {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      {/* Attendance block */}
      {att ? (
        <div style={{ marginBottom: 14, padding: '12px 14px', background: statusColor + '12', borderRadius: 10, border: `1px solid ${statusColor}33` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted,#9ca3af)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance</div>

          {/* Status badge */}
          <div style={{ display: 'inline-block', background: statusColor, color: '#fff', padding: '2px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            {att.status}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'var(--card-bg)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted,#9ca3af)', marginBottom: 3, fontWeight: 600 }}>CHECK IN</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>
                {fmtTime(att.check_in_time) || '—'}
              </div>
            </div>
            <div style={{ background: 'var(--card-bg)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted,#9ca3af)', marginBottom: 3, fontWeight: 600 }}>CHECK OUT</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>
                {fmtTime(att.check_out_time) || '—'}
              </div>
            </div>
          </div>

          {/* Total working hours */}
          {att.worked_hours && parseFloat(att.worked_hours) > 0 && (
            <div style={{ marginTop: 8, background: 'var(--card-bg)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Total Working Hours</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-color,#6366f1)' }}>{fmtHours(att.worked_hours)}</span>
            </div>
          )}

          {att.shift_name && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              Shift: <b>{att.shift_name}</b>
            </div>
          )}

          {att.remarks && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Note: {att.remarks}
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, textAlign: 'center', color: 'var(--text-muted,#9ca3af)', fontSize: 13 }}>
          No attendance record
        </div>
      )}

      {/* Leave block */}
      {leave && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fef3c722', border: '1px solid #fcd34d', borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted,#9ca3af)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave</div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{leave.leave_type}</div>
          <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginTop: 2 }}>{leave.status}</div>
          {leave.reason && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{leave.reason}</div>}
        </div>
      )}

      {/* WFH block */}
      {wfh && (
        <div style={{ padding: '10px 14px', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>WFH Approved</div>
          <div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>Work From Home</div>
          <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>{wfh.reason}</div>
        </div>
      )}

      {!att && !leave && !wfh && (
        <div style={{ fontSize: 13, color: 'var(--text-muted,#9ca3af)', textAlign: 'center', padding: '10px 0' }}>No records for this day.</div>
      )}
    </div>
  );
}

// ── Monthly summary bar ───────────────────────────────────────────────────────
function MonthlySummary({ dayMap }) {
  let present = 0, absent = 0, leaves = 0, late = 0, wfhDays = 0, totalHours = 0;

  for (const day of Object.values(dayMap)) {
    if (day.att) {
      const s = (day.att.status || '').toLowerCase();
      if (s === 'present') present++;
      else if (s === 'delayed') { present++; late++; }
      else absent++;
      if (day.att.worked_hours) totalHours += parseFloat(day.att.worked_hours) || 0;
    }
    if (day.leave && ['approved','Approved'].includes(day.leave.status)) leaves++;
    if (day.wfh) wfhDays++;
  }

  const stats = [
    { label: 'Present', value: present, color: '#22c55e' },
    { label: 'Absent',  value: absent,  color: '#ef4444' },
    { label: 'On Leave', value: leaves, color: '#f59e0b' },
    { label: 'Late',    value: late,    color: '#f97316' },
    { label: 'WFH Days', value: wfhDays, color: '#3b82f6' },
    { label: 'Total Hours', value: fmtHours(totalHours) || '0h', color: '#8b5cf6', noCount: true },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.noCount ? s.value : s.value}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted,#9ca3af)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function EmployeeCalendar() {
  const [year, setYear]         = useState(TODAY.getFullYear());
  const [month, setMonth]       = useState(TODAY.getMonth());
  const [dayMap, setDayMap]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { attendance, leaves, wfhList } = await loadMonthData(year, month);
      setDayMap(buildDayMap(attendance, leaves, wfhList));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); setSelected(null); }, [load]);

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const legend = [
    { type: 'present', label: 'Present' },
    { type: 'delayed', label: 'Late' },
    { type: 'absent',  label: 'Absent' },
    { type: 'leave',   label: 'Leave' },
    { type: 'wfh',     label: 'WFH' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1040, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>📅 My Calendar</h2>

      {/* Monthly summary */}
      {!loading && <MonthlySummary dayMap={dayMap} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: 20, alignItems: 'start' }}>
        <div>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button onClick={prevMonth} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16 }}>‹</button>
            <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{MONTHS[month]} {year}</div>
            <button onClick={nextMonth} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
            {legend.map(l => (
              <div key={l.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: TYPE_DOT[l.type] }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{l.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>↑</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Check-in</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>↓</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Check-out</span>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted,#9ca3af)', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {cells.map((day, i) =>
                day === null
                  ? <div key={`e${i}`} style={{ minHeight: 72 }} />
                  : <DayCell key={day} day={day} year={year} month={month}
                      dayData={dayMap[isoDate(year, month, day)]}
                      today={TODAY}
                      onClick={setSelected}
                      selected={selected === day}
                    />
              )}
            </div>
          )}
        </div>

        {/* Day detail panel */}
        <div style={{ position: 'sticky', top: 24 }}>
          <DayDetail
            day={selected}
            year={year}
            month={month}
            dayData={selected ? dayMap[isoDate(year, month, selected)] : null}
          />
        </div>
      </div>
    </div>
  );
}
