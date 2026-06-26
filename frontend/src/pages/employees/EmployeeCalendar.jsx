import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const TODAY = new Date();

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  // 0=Mon…6=Sun
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

async function loadMonthData(year, month) {
  const from = isoDate(year, month, 1);
  const to   = isoDate(year, month, getDaysInMonth(year, month));

  const [attRes, leaveRes] = await Promise.allSettled([
    api.get('/attendance/my/history', { params: { from_date: from, to_date: to, limit: 100 } }),
    api.get('/leaves/my', { params: { from_date: from, to_date: to } }),
  ]);

  const attData  = attRes.status === 'fulfilled' ? attRes.value.data : null;
  const attendance = Array.isArray(attData?.data) ? attData.data
    : Array.isArray(attData?.attendance) ? attData.attendance
    : Array.isArray(attData) ? attData : [];
  const leaveData = leaveRes.status === 'fulfilled' ? leaveRes.value.data : null;
  const leaves    = Array.isArray(leaveData?.data) ? leaveData.data
    : Array.isArray(leaveData?.leaves) ? leaveData.leaves
    : Array.isArray(leaveData) ? leaveData : [];

  return { attendance, leaves };
}

const TYPE_DOT = {
  present:  '#22c55e',
  absent:   '#ef4444',
  leave:    '#f59e0b',
  wfh:      '#3b82f6',
  holiday:  '#8b5cf6',
  half_day: '#f97316',
};

function buildDayMap(attendance, leaves) {
  const map = {};

  for (const a of attendance) {
    const d = a.date || (a.check_in ? a.check_in.slice(0, 10) : null);
    if (!d) continue;
    map[d] = map[d] || { types: [], att: null, leave: null };
    map[d].att = a;
    map[d].types.push(a.status === 'present' ? 'present' : a.status === 'half_day' ? 'half_day' : 'absent');
  }

  for (const l of leaves) {
    if (!['approved', 'pending'].includes(l.status)) continue;
    const start = new Date(l.from_date);
    const end   = new Date(l.to_date);
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const d = dt.toISOString().slice(0, 10);
      map[d] = map[d] || { types: [], att: null, leave: null };
      map[d].leave = l;
      if (!map[d].types.includes('present')) map[d].types.push('leave');
    }
  }

  return map;
}

function DayCell({ day, year, month, dayData, today, onClick, selected }) {
  const dateStr = isoDate(year, month, day);
  const isToday = dateStr === isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const types   = dayData?.types || [];
  const dots    = [...new Set(types)].slice(0, 3);

  return (
    <div onClick={() => onClick(day)} style={{
      minHeight: 68,
      borderRadius: 8,
      border: isToday ? '2px solid var(--accent-color)' : selected ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
      background: selected ? 'var(--accent-light, rgba(99,102,241,0.08))' : 'var(--card-bg)',
      padding: '6px 8px',
      cursor: 'pointer',
      position: 'relative',
    }}>
      <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent-color)' : 'var(--text-primary)' }}>{day}</div>
      <div style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
        {dots.map(t => <div key={t} style={{ width: 7, height: 7, borderRadius: '50%', background: TYPE_DOT[t] || '#9ca3af' }} />)}
      </div>
    </div>
  );
}

function DayDetail({ day, year, month, dayData }) {
  if (!day) return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20, color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>
      Select a day to see details
    </div>
  );

  const dateStr = isoDate(year, month, day);
  const { att, leave } = dayData || {};

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 14 }}>
        {new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      {att && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ background: TYPE_DOT[att.status] + '22', color: TYPE_DOT[att.status] || '#6b7280', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {att.status?.replace('_', ' ')}
            </span>
            {att.check_in  && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>In: {new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            {att.check_out && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Out: {new Date(att.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        </div>
      )}

      {leave && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave</div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            <b>{leave.leave_type}</b> · {leave.status}
          </div>
          {leave.reason && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{leave.reason}</div>}
        </div>
      )}

      {!att && !leave && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No records for this day.</div>
      )}
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
      const { attendance, leaves } = await loadMonthData(year, month);
      setDayMap(buildDayMap(attendance, leaves));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); setSelected(null); }, [load]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const legend = [
    { type: 'present', label: 'Present' },
    { type: 'absent',  label: 'Absent' },
    { type: 'leave',   label: 'Leave' },
    { type: 'half_day',label: 'Half Day' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>My Calendar</h2>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {legend.map(l => (
          <div key={l.type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: TYPE_DOT[l.type] }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>
        <div>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16 }}>‹</button>
            <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{MONTHS[month]} {year}</div>
            <button onClick={nextMonth} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {cells.map((day, i) =>
                day === null
                  ? <div key={`e${i}`} style={{ minHeight: 68 }} />
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

        <DayDetail day={selected} year={year} month={month} dayData={selected ? dayMap[isoDate(year, month, selected)] : null} />
      </div>
    </div>
  );
}
