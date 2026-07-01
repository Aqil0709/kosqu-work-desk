import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';
import './LiveLocationView.css';

/* ── helpers ─────────────────────────────────────────────── */
const timeAgo = (dt) => {
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const gmapsUrl = (lat, lon) =>
  `https://www.google.com/maps?q=${lat},${lon}`;

const REFRESH_INTERVAL = 30_000; // 30 s

/* ═══════════════════════════════════════════════════════════ */
const LiveLocationView = () => {
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [selected,  setSelected]  = useState(null);   // selected employee for trail
  const [trail,     setTrail]     = useState([]);
  const [trailDate, setTrailDate] = useState(new Date().toISOString().split('T')[0]);
  const [trailLoading, setTrailLoading] = useState(false);
  const timerRef = useRef(null);

  /* ── fetch live data ── */
  const fetchLive = useCallback(async () => {
    try {
      const res = await api.get('/location-tracking/live');
      if (res.data.success) {
        setEmployees(res.data.employees || []);
        setLastFetch(new Date());
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchLive();
    timerRef.current = setInterval(fetchLive, REFRESH_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchLive]);

  /* ── fetch trail ── */
  const fetchTrail = useCallback(async (emp, date) => {
    if (!emp) return;
    setTrailLoading(true);
    try {
      const res = await api.get(`/location-tracking/history/${emp.employee_id}`, { params: { date } });
      if (res.data.success) setTrail(res.data.trail || []);
    } catch (_) { setTrail([]); }
    finally { setTrailLoading(false); }
  }, []);

  const openTrail = (emp) => {
    setSelected(emp);
    fetchTrail(emp, trailDate);
  };

  const handleDateChange = (e) => {
    setTrailDate(e.target.value);
    if (selected) fetchTrail(selected, e.target.value);
  };

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <div className="llv-root">
      {/* Header */}
      <div className="llv-header">
        <div>
          <h2 className="llv-title">🗺️ Live Location Tracking</h2>
          <p className="llv-sub">Employees who have checked in and pinged location in last 10 minutes</p>
        </div>
        <div className="llv-header-actions">
          <span className="llv-last-fetch">
            {lastFetch ? `Updated ${timeAgo(lastFetch)}` : 'Loading…'}
          </span>
          <button className="llv-refresh-btn" onClick={fetchLive} title="Refresh">
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="llv-loading"><div className="llv-spinner" />Loading live data…</div>
      )}

      {!loading && employees.length === 0 && (
        <div className="llv-empty">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📍</div>
          <p>No employees currently checked in.</p>
          <small>Location tracking starts automatically after Face Check-In and stops on Check-Out.</small>
        </div>
      )}

      {!loading && employees.length > 0 && (
        <div className="llv-grid">
          {employees.map(emp => {
            const name = `${emp.first_name} ${emp.last_name}`;
            const ago  = emp.last_updated_at ? timeAgo(emp.last_updated_at) : 'never';
            const isSelected = selected?.employee_id === emp.employee_id;
            const isDisabled = emp.tracking_status === 'disabled' && !emp.is_offline;
            const hasLocation = emp.latitude != null && emp.longitude != null;

            return (
              <div
                key={emp.employee_id}
                className={`llv-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'llv-card-alert' : ''}`}
              >
                <div className="llv-card-top">
                  <div className="llv-avatar">{emp.first_name[0]}{emp.last_name[0]}</div>
                  <div className="llv-info">
                    <div className="llv-name">{name}</div>
                    <div className="llv-position">
                      {emp.position || 'Employee'}{emp.department_name ? ` · ${emp.department_name}` : ''}
                    </div>
                    <div className="llv-status-row">
                      <span className={`llv-att-badge ${emp.attendance_status === 'Present' ? 'present' : 'late'}`}>
                        {emp.attendance_status || 'Checked In'}
                      </span>
                      {emp.shift_name && <span className="llv-shift-badge">{emp.shift_name}</span>}
                      {emp.battery !== null && emp.battery !== undefined && (
                        <span className="llv-battery" title="Battery">
                          🔋 {emp.battery}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="llv-ping-time">{ago}</div>
                </div>

                {isDisabled && (
                  <div className="llv-alert-banner">
                    ⚠️ Location Disabled By Employee
                  </div>
                )}

                {hasLocation ? (
                  <div className="llv-coords">
                    📍 {isDisabled ? 'Last known: ' : ''}{parseFloat(emp.latitude).toFixed(5)}, {parseFloat(emp.longitude).toFixed(5)}
                    {emp.accuracy && <span className="llv-accuracy"> ±{Math.round(emp.accuracy)}m</span>}
                  </div>
                ) : (
                  <div className="llv-coords llv-coords-none">📍 No location reported yet</div>
                )}

                {emp.check_in && (
                  <div className="llv-checkin-time">
                    Checked in: {new Date(`1970-01-01T${emp.check_in}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {emp.working_hours_completed != null && ` · ${emp.working_hours_completed}h completed`}
                  </div>
                )}

                <div className="llv-card-actions">
                  {hasLocation && (
                    <a
                      href={gmapsUrl(emp.latitude, emp.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="llv-btn llv-btn-map"
                    >
                      🗺️ Open in Maps
                    </a>
                  )}
                  <button
                    className={`llv-btn llv-btn-trail ${isSelected ? 'active' : ''}`}
                    onClick={() => isSelected ? setSelected(null) : openTrail(emp)}
                  >
                    {isSelected ? '✕ Close Trail' : '📈 View Trail'}
                  </button>
                </div>

                {/* Trail panel */}
                {isSelected && (
                  <div className="llv-trail-panel">
                    <div className="llv-trail-header">
                      <strong>Location Trail</strong>
                      <input
                        type="date"
                        className="llv-date-input"
                        value={trailDate}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={handleDateChange}
                      />
                    </div>

                    {trailLoading && <div className="llv-trail-loading"><div className="llv-spinner-sm" /> Loading trail…</div>}

                    {!trailLoading && trail.length === 0 && (
                      <div className="llv-trail-empty">No pings recorded for this date.</div>
                    )}

                    {!trailLoading && trail.length > 0 && (
                      <div className="llv-trail-list">
                        {trail.map((p, i) => (
                          <a
                            key={i}
                            href={gmapsUrl(p.latitude, p.longitude)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="llv-trail-item"
                          >
                            <span className="llv-trail-dot" />
                            <span className="llv-trail-time">
                              {new Date(p.pinged_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="llv-trail-coord">
                              {parseFloat(p.latitude).toFixed(4)}, {parseFloat(p.longitude).toFixed(4)}
                            </span>
                            {p.speed !== null && p.speed > 0.5 && (
                              <span className="llv-trail-speed">🚶 {(p.speed * 3.6).toFixed(1)} km/h</span>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveLocationView;
