import React, { useState, useMemo, useEffect } from 'react';
import api from '../../../services/api';
import { brandingAPI } from '../../../services/brandingAPI';
import IDCardTemplate from '../../../components/IDCard/IDCardTemplate';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const BLUE   = '#1b3260';
const PER_PAGE = 10;

const SortIcon = ({ active, dir }) => (
  <span style={{ marginLeft:4, opacity:active ? 1 : 0.35, fontSize:10 }}>
    {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
  </span>
);

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const IDCardGenerator = ({ employees = [] }) => {
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState('first_name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage]       = useState(1);

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [cardData, setCardData]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [branding, setBranding]       = useState({});

  useEffect(() => {
    brandingAPI.get().then(res => {
      if (res.data?.success && res.data?.branding) setBranding(res.data.branding);
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = employees.filter(e => {
      const name = `${e.first_name||''} ${e.last_name||''}`.toLowerCase();
      const id   = (e.employee_id || e.id || '').toString().toLowerCase();
      const dept = (e.department_name || e.department || '').toLowerCase();
      const pos  = (e.position || '').toLowerCase();
      return !q || name.includes(q) || id.includes(q) || dept.includes(q) || pos.includes(q);
    });
    list.sort((a, b) => {
      let av = '', bv = '';
      if (sortKey === 'first_name')      { av = `${a.first_name||''} ${a.last_name||''}`; bv = `${b.first_name||''} ${b.last_name||''}`; }
      else if (sortKey === 'employee_id'){ av = a.employee_id||''; bv = b.employee_id||''; }
      else if (sortKey === 'department') { av = a.department_name||a.department||''; bv = b.department_name||b.department||''; }
      else if (sortKey === 'position')   { av = a.position||''; bv = b.position||''; }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [employees, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageSlice  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleGenerate = async (emp) => {
    const empId = emp.user_id || emp.employee_id || emp.id;
    if (!empId) return;
    try {
      setSelectedEmp(emp);
      setCardData(null);
      setLoading(true);
      const res = await api.get(`/employees/${empId}/id-card`);
      setCardData(res.data?.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Error loading card data');
    } finally {
      setLoading(false);
    }
  };

  const photoUrl = cardData?.profile_photo
    ? `${API_BASE}/${cardData.profile_photo.replace(/^\//, '')}?token=${encodeURIComponent(localStorage.getItem('token')||'')}`
    : null;

  const S = {
    page:    { padding: 24, fontFamily: 'Inter,system-ui,sans-serif' },
    title:   { fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--theme-text-strong,#0f172a)' },
    sub:     { fontSize: 13, color: 'var(--theme-text-muted,#64748b)', marginTop: 3 },
    toolbar: { display:'flex', gap: 10, marginBottom: 16, flexWrap:'wrap', alignItems:'center' },
    search:  { padding:'8px 14px', border:'1.5px solid var(--card-border,#e2e8f0)', borderRadius: 9, fontSize: 13, minWidth: 240, background:'var(--card-bg,#fff)', color:'var(--theme-text,#0f172a)', outline:'none' },
    table:   { width:'100%', borderCollapse:'collapse', fontSize: 13 },
    th:      { padding:'10px 14px', textAlign:'left', fontWeight: 700, fontSize: 11, textTransform:'uppercase', letterSpacing:.5, color:'var(--theme-text-muted,#64748b)', borderBottom:'2px solid var(--card-border,#e2e8f0)', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' },
    td:      { padding:'11px 14px', borderBottom:'1px solid var(--card-border,#e2e8f0)', color:'var(--theme-text,#0f172a)', verticalAlign:'middle' },
    genBtn:  { padding:'6px 16px', background: BLUE, color:'#fff', border:'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor:'pointer' },
    avatar:  { width: 34, height: 34, borderRadius: '50%', background: BLUE, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight: 700, fontSize: 12, flexShrink: 0 },
    empCell: { display:'flex', alignItems:'center', gap: 10 },
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
        <div>
          <h2 style={S.title}>ID Card Generator</h2>
          <p style={S.sub}>{employees.length} employee{employees.length !== 1 ? 's' : ''} · click Generate to preview and print</p>
        </div>
      </div>

      {/* Card preview */}
      {selectedEmp && (
        <div style={{ padding:24, background:'var(--card-bg,#fff)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:14, marginBottom:24, boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--theme-text-muted,#64748b)' }}>Loading card...</div>
          ) : cardData ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
                <span style={{ fontSize:15, fontWeight:700, color:'var(--theme-text-strong,#0f172a)' }}>
                  {cardData.first_name} {cardData.last_name}
                </span>
                <span style={{ fontSize:12, color:'var(--theme-text-muted,#64748b)', background:'var(--theme-bg-muted,#f1f5f9)', padding:'2px 8px', borderRadius:5 }}>
                  {cardData.emp_number || cardData.employee_id}
                </span>
                <button onClick={() => { setCardData(null); setSelectedEmp(null); }}
                  style={{ marginLeft:'auto', padding:'7px 12px', borderRadius:9, border:'1px solid var(--card-border,#e2e8f0)', background:'transparent', fontWeight:600, fontSize:12, cursor:'pointer', color:'var(--theme-text-muted,#64748b)' }}>
                  Close
                </button>
              </div>
              <IDCardTemplate cardData={cardData} photoUrl={photoUrl} branding={branding}/>
            </>
          ) : null}
        </div>
      )}

      {/* Toolbar */}
      <div style={S.toolbar}>
        <input
          style={S.search}
          placeholder="Search by name, ID, department or position..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--theme-text-muted,#64748b)' }}>
          {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ borderRadius:12, border:'1px solid var(--card-border,#e2e8f0)', overflow:'hidden', background:'var(--card-bg,#fff)' }}>
        <table style={S.table}>
          <thead style={{ background:'var(--theme-bg-muted,#f8fafc)' }}>
            <tr>
              <th style={S.th} onClick={() => toggleSort('first_name')}>Employee <SortIcon active={sortKey==='first_name'} dir={sortDir} /></th>
              <th style={S.th} onClick={() => toggleSort('employee_id')}>Employee ID <SortIcon active={sortKey==='employee_id'} dir={sortDir} /></th>
              <th style={S.th} onClick={() => toggleSort('position')}>Position <SortIcon active={sortKey==='position'} dir={sortDir} /></th>
              <th style={S.th} onClick={() => toggleSort('department')}>Department <SortIcon active={sortKey==='department'} dir={sortDir} /></th>
              <th style={{ ...S.th, textAlign:'center', cursor:'default' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.length === 0 ? (
              <tr><td colSpan={5} style={{ ...S.td, textAlign:'center', padding:'40px 0', color:'var(--theme-text-muted,#94a3b8)' }}>
                {search ? 'No employees match your search.' : 'No employees found.'}
              </td></tr>
            ) : pageSlice.map(emp => {
              const ini = `${emp.first_name?.[0]||''}${emp.last_name?.[0]||''}`.toUpperCase() || '?';
              const isSelected = selectedEmp &&
                (emp.user_id || emp.employee_id || emp.id) === (selectedEmp.user_id || selectedEmp.employee_id || selectedEmp.id);
              return (
                <tr key={emp.user_id || emp.employee_id || emp.id}
                  style={{ background: isSelected ? 'rgba(28,71,201,0.05)' : 'transparent' }}>
                  <td style={S.td}>
                    <div style={S.empCell}>
                      <div style={S.avatar}>{ini}</div>
                      <div>
                        <div style={{ fontWeight:600 }}>{emp.first_name} {emp.last_name}</div>
                        <div style={{ fontSize:11, color:'var(--theme-text-muted,#64748b)' }}>{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={S.td}>
                    <span style={{ fontFamily:'monospace', fontSize:12, background:'var(--theme-bg-muted,#f1f5f9)', padding:'2px 7px', borderRadius:5 }}>
                      {emp.employee_id || emp.id || '""'}
                    </span>
                  </td>
                  <td style={S.td}>{emp.position || '""'}</td>
                  <td style={S.td}>{emp.department_name || emp.department || '""'}</td>
                  <td style={{ ...S.td, textAlign:'center' }}>
                    <button onClick={() => handleGenerate(emp)} disabled={loading && isSelected}
                      style={{ ...S.genBtn, opacity:(loading && isSelected) ? 0.6 : 1 }}>
                      {loading && isSelected ? 'Loading...' : 'Generate Card'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:16, justifyContent:'center' }}>
          <button
            style={{ padding:'5px 12px', borderRadius:7, border:'1.5px solid var(--card-border,#e2e8f0)', background:'transparent', color:'var(--theme-text,#334155)', fontWeight:600, cursor:'pointer', fontSize:13 }}
            onClick={() => setPage(p => Math.max(1,p-1))} disabled={safePage===1}>
            "¹ Prev
          </button>
          {Array.from({length:totalPages},(_,i)=>i+1)
            .filter(n=>n===1||n===totalPages||Math.abs(n-safePage)<=1)
            .reduce((acc,n,i,arr)=>{ if(i>0&&n-arr[i-1]>1) acc.push('...'); acc.push(n); return acc; },[])
            .map((n,i) => n==='...'
              ? <span key={`e${i}`} style={{padding:'0 4px',color:'var(--theme-text-muted,#64748b)'}}>...</span>
              : <button key={n} onClick={()=>setPage(n)}
                  style={{ padding:'5px 12px', borderRadius:7, border:'1.5px solid',
                    borderColor: n===safePage ? BLUE : 'var(--card-border,#e2e8f0)',
                    background:  n===safePage ? BLUE : 'transparent',
                    color:       n===safePage ? '#fff' : 'var(--theme-text,#334155)',
                    fontWeight:600, cursor:'pointer', fontSize:13 }}>
                  {n}
                </button>
            )}
          <button
            style={{ padding:'5px 12px', borderRadius:7, border:'1.5px solid var(--card-border,#e2e8f0)', background:'transparent', color:'var(--theme-text,#334155)', fontWeight:600, cursor:'pointer', fontSize:13 }}
            onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={safePage===totalPages}>
            Next "º
          </button>
        </div>
      )}
    </div>
  );
};

export default IDCardGenerator;
