import { useState, useEffect } from 'react';
import api from '../../services/api';
import './ApprovalAnalytics.css';

const MODULE_LABELS = {
  leave: 'Leave', wfh: 'WFH', expense: 'Expense',
  attendance_reg: 'Attendance Reg', salary_revision: 'Salary Revision',
  recruitment_job: 'Recruitment', candidate: 'Candidate', offer: 'Offer',
  asset_request: 'Asset Request', asset_return: 'Asset Return',
  project: 'Project', purchase: 'Purchase', resignation: 'Resignation',
  exit_clearance: 'Exit Clearance', full_final: 'Full & Final',
  training: 'Training', travel: 'Travel',
};

export default function ApprovalAnalytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFrom]   = useState('');
  const [toDate, setTo]       = useState('');
  const [moduleType, setMod]  = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (fromDate)   params.from_date   = fromDate;
      if (toDate)     params.to_date     = toDate;
      if (moduleType) params.module_type = moduleType;
      const res = await api.get('/approvals/analytics', { params });
      setData(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totals = (data?.by_module || []).reduce(
    (acc, r) => ({
      total:        acc.total + Number(r.total),
      approved:     acc.approved + Number(r.approved),
      rejected:     acc.rejected + Number(r.rejected),
      auto_approved: acc.auto_approved + Number(r.auto_approved),
      pending:      acc.pending + Number(r.pending),
      sla_breached: acc.sla_breached + Number(r.sla_breached),
    }),
    { total: 0, approved: 0, rejected: 0, auto_approved: 0, pending: 0, sla_breached: 0 }
  );

  const approvalRate = totals.total > 0
    ? Math.round((totals.approved / totals.total) * 100)
    : 0;

  return (
    <div className="appr-analytics">
      <div className="appr-analytics__header">
        <h2>Approval Analytics</h2>
        <div className="appr-analytics__filters">
          <input type="date" value={fromDate} onChange={e => setFrom(e.target.value)} placeholder="From" />
          <input type="date" value={toDate}   onChange={e => setTo(e.target.value)}   placeholder="To" />
          <select value={moduleType} onChange={e => setMod(e.target.value)}>
            <option value="">All Modules</option>
            {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={load} disabled={loading}>🔄 Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="appr-analytics__loading">Loading analytics…</div>
      ) : (
        <>
          {/* KPI row */}
          <div className="appr-analytics__kpi-row">
            {[
              { label: 'Total Requests',  value: totals.total,        color: '#0d6efd' },
              { label: 'Approved',        value: totals.approved,     color: '#198754' },
              { label: 'Rejected',        value: totals.rejected,     color: '#dc3545' },
              { label: 'Auto-Approved',   value: totals.auto_approved,color: '#6f42c1' },
              { label: 'Pending',         value: totals.pending,      color: '#fd7e14' },
              { label: 'SLA Breached',    value: totals.sla_breached, color: '#dc3545' },
              { label: 'Approval Rate',   value: `${approvalRate}%`,  color: '#198754' },
            ].map(k => (
              <div key={k.label} className="appr-analytics__kpi">
                <div className="appr-analytics__kpi-value" style={{ color: k.color }}>{k.value}</div>
                <div className="appr-analytics__kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {/* By module table */}
          <div className="appr-analytics__section">
            <h3>By Module</h3>
            <div className="appr-analytics__table-wrap">
              <table className="appr-analytics__table">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Total</th>
                    <th>Approved</th>
                    <th>Rejected</th>
                    <th>Auto</th>
                    <th>Pending</th>
                    <th>SLA Breached</th>
                    <th>Avg Cycle (hrs)</th>
                    <th>Approval Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.by_module || []).map(row => {
                    const rate = row.total > 0 ? Math.round((row.approved / row.total) * 100) : 0;
                    return (
                      <tr key={row.module_type}>
                        <td><strong>{MODULE_LABELS[row.module_type] || row.module_type}</strong></td>
                        <td>{row.total}</td>
                        <td className="appr-analytics__cell--green">{row.approved}</td>
                        <td className="appr-analytics__cell--red">{row.rejected}</td>
                        <td>{row.auto_approved}</td>
                        <td className="appr-analytics__cell--orange">{row.pending}</td>
                        <td className={row.sla_breached > 0 ? 'appr-analytics__cell--red' : ''}>{row.sla_breached}</td>
                        <td>{row.avg_cycle_hours ?? '—'}</td>
                        <td>
                          <div className="appr-analytics__rate-bar">
                            <div className="appr-analytics__rate-fill" style={{ width: `${rate}%` }} />
                            <span>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!data?.by_module?.length) && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', color: '#6c757d' }}>No data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top approvers */}
          {data?.top_approvers?.length > 0 && (
            <div className="appr-analytics__section">
              <h3>Top Approvers</h3>
              <div className="appr-analytics__table-wrap">
                <table className="appr-analytics__table">
                  <thead>
                    <tr>
                      <th>Approver</th>
                      <th>Total Decisions</th>
                      <th>Approvals</th>
                      <th>Rejections</th>
                      <th>Avg Response (hrs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_approvers.map(a => (
                      <tr key={a.actioned_by}>
                        <td><strong>{a.approver_name}</strong></td>
                        <td>{a.decisions}</td>
                        <td className="appr-analytics__cell--green">{a.approvals}</td>
                        <td className="appr-analytics__cell--red">{a.rejections}</td>
                        <td>{a.avg_response_hours ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
