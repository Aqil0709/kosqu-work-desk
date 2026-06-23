import React, { useState, useEffect } from "react";
import { resignationAPI } from "../../../services/resignationAPI";
import { resignationPDFService } from "../../../services/resignationPDFService";
import { API_BASE_URL } from "../../../services/api";
import { departmentAPI } from "../../../services/departmentAPI";
import { Eye, CheckCircle, XCircle, Clock, FileText, Calendar, RotateCcw, Search } from "lucide-react";

const STATUS_CONFIG = {
    pending:      { label: "Pending",      color: "#b45309", bg: "#fef3c7" },
    under_review: { label: "Under Review", color: "#1d4ed8", bg: "#dbeafe" },
    approved:     { label: "Approved",     color: "#15803d", bg: "#dcfce7" },
    accepted:     { label: "Approved",     color: "#15803d", bg: "#dcfce7" },
    rejected:     { label: "Rejected",     color: "#b91c1c", bg: "#fee2e2" },
    withdrawn:    { label: "Withdrawn",    color: "#6b7280", bg: "#f3f4f6" },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span style={{ color: cfg.color, background: cfg.bg, padding: "4px 10px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 700 }}>
            {cfg.label}
        </span>
    );
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "--";

const ResignationRequests = () => {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [deptFilter, setDeptFilter] = useState("");
    const [departments, setDepartments] = useState([]);
    const [search, setSearch] = useState("");
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [approveData, setApproveData] = useState({ acceptedLastDay: "", hrNote: "" });
    const [rejectReason, setRejectReason] = useState("");
    const [overrideData, setOverrideData] = useState({ revised_last_working_date: "", override_reason: "" });
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        departmentAPI.getAll().then(r => {
            const d = r.data?.data || r.data?.departments || r.data || [];
            setDepartments(Array.isArray(d) ? d : []);
        }).catch(() => {});
    }, []);

    useEffect(() => { fetchRequests(); }, [statusFilter, deptFilter, search]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (statusFilter !== "all") params.status = statusFilter;
            if (deptFilter) params.department_id = deptFilter;
            if (search.trim()) params.search = search.trim();
            const apiRes = await resignationAPI.getAllRequests(params);
            setRequests(apiRes.data?.data || []);
            setError(null);
        } catch (err) {
            setError("Failed to load requests. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const openDetail = async (req) => {
        setSelectedRequest(req); setDetailData(req); setShowDetailModal(true); setDetailLoading(true);
        try {
            const res = await resignationAPI.getRequestById(req.id);
            setDetailData(res.data?.data || req);
        } catch (_) {}
        finally { setDetailLoading(false); }
    };

    const handleMarkUnderReview = async (req) => {
        try { await resignationAPI.markUnderReview(req.id); fetchRequests(); }
        catch (err) { alert("Failed: " + (err.response?.data?.message || err.message)); }
    };

    const handleOpenApprove = (req) => {
        setSelectedRequest(req);
        const lwd = req.revised_last_working_date || req.original_last_working_date || req.requested_last_day;
        setApproveData({ acceptedLastDay: lwd ? new Date(lwd).toISOString().split("T")[0] : "", hrNote: "" });
        setShowApproveModal(true);
    };

    const handleApproveSubmit = async (e) => {
        e.preventDefault(); setIsProcessing(true);
        try {
            const pdfBlob = await resignationPDFService.generatePDFBlob({
                employeeName: `${selectedRequest.first_name} ${selectedRequest.last_name}`,
                joiningDate: selectedRequest.joining_date,
                requestedLastDay: approveData.acceptedLastDay,
                hrNote: approveData.hrNote,
                generatedAt: new Date(),
                refNumber: selectedRequest.ref_number,
            });
            const formData = new FormData();
            formData.append("accepted_last_day", approveData.acceptedLastDay);
            formData.append("hr_note", approveData.hrNote);
            formData.append("pdf", pdfBlob, `resignation_${selectedRequest.id}.pdf`);
            await resignationAPI.approveRequest(selectedRequest.id, formData);
            setShowApproveModal(false);
            await fetchRequests();
            alert("Resignation approved and letter generated successfully!");
        } catch (err) { alert("Failed: " + (err.response?.data?.message || err.message)); }
        finally { setIsProcessing(false); }
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault(); setIsProcessing(true);
        try { await resignationAPI.rejectRequest(selectedRequest.id, { rejection_reason: rejectReason }); setShowRejectModal(false); fetchRequests(); }
        catch (err) { alert("Failed: " + (err.response?.data?.message || err.message)); }
        finally { setIsProcessing(false); }
    };

    const handleOverrideSubmit = async (e) => {
        e.preventDefault(); setIsProcessing(true);
        try { await resignationAPI.overrideLWD(selectedRequest.id, overrideData); setShowOverrideModal(false); fetchRequests(); }
        catch (err) { alert("Failed: " + (err.response?.data?.message || err.message)); }
        finally { setIsProcessing(false); }
    };

    const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 };
    const mbox = { background: "var(--theme-surface,#fff)", padding: "24px", borderRadius: "14px", width: "440px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto" };
    const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--theme-border,#cbd5e1)", boxSizing: "border-box", fontSize: 14, background: "var(--theme-bg,#f8fafc)", color: "var(--theme-text,#334155)" };
    const lbl = { display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "var(--theme-text,#334155)" };
    const abtn = (fn, icon, title, color) => (
        <button onClick={fn} title={title} style={{ padding: "6px 8px", background: "var(--theme-bg,#f1f5f9)", border: "none", borderRadius: 6, cursor: "pointer", color, display: "flex", alignItems: "center" }}>{icon}</button>
    );

    return (
        <div style={{ padding: "28px 24px", background: "var(--theme-bg,#f8fafc)", minHeight: "100vh" }}>
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={26} color="#4f46e5" />
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--theme-text-strong,#1e293b)", margin: 0 }}>Resignation Requests</h2>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                    <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input type="text" placeholder="Search name or ref..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, paddingLeft: 32 }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, width: "auto", minWidth: 140, cursor: "pointer" }}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="withdrawn">Withdrawn</option>
                </select>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ ...inp, width: "auto", minWidth: 150, cursor: "pointer" }}>
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button onClick={fetchRequests} style={{ padding: "9px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                    <RotateCcw size={16} /> Refresh
                </button>
            </div>

            <div style={{ background: "var(--theme-surface,#fff)", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,.05)", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ background: "var(--theme-bg,#f1f5f9)", fontSize: "0.85rem" }}>
                                {["Ref #","Employee","Emp Code","Designation","Department","Notice","Resignation Date","Last Working Day","Status","Actions"].map(h => (
                                    <th key={h} style={{ padding: "13px 16px", borderBottom: "1px solid var(--theme-border,#e2e8f0)", fontWeight: 700, whiteSpace: "nowrap", color: "var(--theme-text-muted,#475569)" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>Loading...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#b91c1c" }}>{error}</td></tr>
                            ) : requests.length > 0 ? requests.map(req => (
                                <tr key={req.id} style={{ borderBottom: "1px solid var(--theme-border,#f1f5f9)" }}>
                                    <td style={{ padding: "13px 16px", fontWeight: 700, color: "var(--theme-text,#334155)", fontSize: 13, whiteSpace: "nowrap" }}>{req.ref_number}</td>
                                    <td style={{ padding: "13px 16px", color: "var(--theme-text,#334155)", fontSize: 13, whiteSpace: "nowrap" }}>
                                        {req.employee_name || `${req.first_name || ""} ${req.last_name || ""}`.trim() || "--"}
                                    </td>
                                    <td style={{ padding: "13px 16px", color: "var(--theme-text-muted,#64748b)", fontSize: 12, whiteSpace: "nowrap" }}>{req.employee_code || "--"}</td>
                                    <td style={{ padding: "13px 16px", color: "var(--theme-text-muted,#64748b)", fontSize: 12, whiteSpace: "nowrap" }}>{req.designation || req.emp_designation || "--"}</td>
                                    <td style={{ padding: "13px 16px", color: "var(--theme-text-muted,#64748b)", fontSize: 13 }}>{req.department_name || req.department || "--"}</td>
                                    <td style={{ padding: "13px 16px", color: "var(--theme-text-muted,#64748b)", fontSize: 13, whiteSpace: "nowrap" }}>{req.notice_period_days ? `${req.notice_period_days}d` : "--"}</td>
                                    <td style={{ padding: "13px 16px", color: "var(--theme-text-muted,#64748b)", fontSize: 13, whiteSpace: "nowrap" }}>{fmtDate(req.resignation_date || req.requested_last_day)}</td>
                                    <td style={{ padding: "13px 16px", color: "var(--theme-text-muted,#64748b)", fontSize: 13, whiteSpace: "nowrap" }}>
                                        {fmtDate(req.revised_last_working_date || req.original_last_working_date)}
                                        {req.override_reason && <span title={req.override_reason} style={{ marginLeft: 4, color: "#f59e0b", fontSize: 12 }}>✎</span>}
                                    </td>
                                    <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}><StatusBadge status={req.status} /></td>
                                    <td style={{ padding: "13px 16px" }}>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            {abtn(() => openDetail(req), <Eye size={16} />, "View Details", "#4f46e5")}
                                            {req.status === "pending" && abtn(() => handleMarkUnderReview(req), <Clock size={16} />, "Mark Under Review", "#1d4ed8")}
                                            {["pending","under_review"].includes(req.status) && <>
                                                {abtn(() => handleOpenApprove(req), <CheckCircle size={16} />, "Approve", "#15803d")}
                                                {abtn(() => { setSelectedRequest(req); setRejectReason(""); setShowRejectModal(true); }, <XCircle size={16} />, "Reject", "#b91c1c")}
                                                {abtn(() => {
                                                    setSelectedRequest(req);
                                                    const lwd = req.revised_last_working_date || req.original_last_working_date;
                                                    setOverrideData({ revised_last_working_date: lwd ? new Date(lwd).toISOString().split("T")[0] : "", override_reason: "" });
                                                    setShowOverrideModal(true);
                                                }, <Calendar size={16} />, "Override LWD", "#d97706")}
                                            </>}
                                            {(req.status === "approved" || req.status === "accepted") && req.letter_url &&
                                                abtn(() => {
                                                  const watermarked = (API_BASE_URL + req.letter_url).replace('/uploads/', '/uploads-watermarked/');
                                                  const token = localStorage.getItem('token');
                                                  window.open(`${watermarked}?token=${token}`, "_blank");
                                                }, <FileText size={16} />, "View Letter", "#4f46e5")
                                            }
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>No requests found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showDetailModal && (
                <div style={overlay} onClick={() => setShowDetailModal(false)}>
                    <div style={{ ...mbox, width: 560 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                            <h3 style={{ margin: 0, color: "var(--theme-text-strong,#1e293b)" }}>Resignation Details</h3>
                            <button onClick={() => setShowDetailModal(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>×</button>
                        </div>
                        {detailLoading ? <p style={{ textAlign: "center" }}>Loading...</p> : detailData && (
                            <>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                                    {[
                                        ["Ref Number", detailData.ref_number],
                                        ["Status", <StatusBadge status={detailData.status} />],
                                        ["Employee", detailData.employee_name || `${detailData.first_name || ""} ${detailData.last_name || ""}`.trim()],
                                        ["Employee Code", detailData.employee_code || "--"],
                                        ["Designation", detailData.designation || detailData.emp_designation || "--"],
                                        ["Department", detailData.department_name || detailData.department || "--"],
                                        ["Resignation Date", fmtDate(detailData.resignation_date || detailData.requested_last_day)],
                                        ["Notice Period", detailData.notice_period_days ? `${detailData.notice_period_days} days` : "--"],
                                        ["Original LWD", fmtDate(detailData.original_last_working_date)],
                                        ["Final LWD", fmtDate(detailData.revised_last_working_date || detailData.original_last_working_date)],
                                    ].map(([l, v]) => (
                                        <div key={l}>
                                            <p style={{ margin: 0, fontSize: 11, color: "var(--theme-text-muted,#64748b)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{l}</p>
                                            <p style={{ margin: "3px 0 0", fontSize: 14, color: "var(--theme-text-strong,#0f172a)", fontWeight: 600 }}>{v}</p>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginBottom: 14 }}>
                                    <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 600, color: "var(--theme-text-muted,#64748b)", textTransform: "uppercase" }}>Reason</p>
                                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{detailData.reason}</p>
                                </div>
                                {detailData.remarks && <div style={{ marginBottom: 14 }}>
                                    <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 600, color: "var(--theme-text-muted,#64748b)", textTransform: "uppercase" }}>Remarks</p>
                                    <p style={{ margin: 0, fontSize: 14 }}>{detailData.remarks}</p>
                                </div>}
                                {detailData.override_reason && <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                                    <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#b45309" }}>LWD Override</p>
                                    <p style={{ margin: 0, fontSize: 13 }}>{detailData.override_reason}</p>
                                </div>}
                                {detailData.rejection_reason && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                                    <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>Rejection Reason</p>
                                    <p style={{ margin: 0, fontSize: 13 }}>{detailData.rejection_reason}</p>
                                </div>}
                                {detailData.hr_note && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                                    <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#15803d" }}>HR Note</p>
                                    <p style={{ margin: 0, fontSize: 13 }}>{detailData.hr_note}</p>
                                </div>}
                                {detailData.history?.length > 0 && <div>
                                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "var(--theme-text-muted,#64748b)", textTransform: "uppercase" }}>Status History</p>
                                    {detailData.history.map((h, i) => (
                                        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4f46e5", marginTop: 5, flexShrink: 0 }} />
                                            <div>
                                                <p style={{ margin: 0, fontSize: 13 }}>
                                                    <StatusBadge status={h.status} />
                                                    <span style={{ marginLeft: 6, fontSize: 11, color: "var(--theme-text-muted,#94a3b8)" }}>
                                                        {new Date(h.created_at).toLocaleString("en-GB")}{h.first_name ? ` · ${h.first_name} ${h.last_name}` : ""}
                                                    </span>
                                                </p>
                                                {h.note && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--theme-text-muted,#64748b)" }}>{h.note}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>}
                            </>
                        )}
                    </div>
                </div>
            )}

            {showApproveModal && (
                <div style={overlay}>
                    <div style={mbox}>
                        <h3 style={{ margin: "0 0 8px", color: "var(--theme-text-strong,#1e293b)" }}>Approve Resignation</h3>
                        <p style={{ fontSize: 13, color: "var(--theme-text-muted,#64748b)", marginBottom: 18 }}>Approving for <strong>{selectedRequest?.first_name} {selectedRequest?.last_name}</strong>.</p>
                        <form onSubmit={handleApproveSubmit}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={lbl}>Last Working Day</label>
                                <input type="date" required style={inp} value={approveData.acceptedLastDay} onChange={e => setApproveData(p => ({ ...p, acceptedLastDay: e.target.value }))} />
                            </div>
                            <div style={{ marginBottom: 22 }}>
                                <label style={lbl}>HR Note (optional)</label>
                                <textarea rows="3" style={{ ...inp, resize: "vertical" }} value={approveData.hrNote} onChange={e => setApproveData(p => ({ ...p, hrNote: e.target.value }))} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                                <button type="button" onClick={() => setShowApproveModal(false)} style={{ padding: "8px 16px", background: "var(--theme-bg,#f1f5f9)", color: "var(--theme-text,#475569)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                                <button type="submit" disabled={isProcessing} style={{ padding: "8px 18px", background: "#15803d", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, opacity: isProcessing ? 0.7 : 1 }}>{isProcessing ? "Processing..." : "Approve & Generate Letter"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showRejectModal && (
                <div style={overlay}>
                    <div style={mbox}>
                        <h3 style={{ margin: "0 0 16px", color: "var(--theme-text-strong,#1e293b)" }}>Reject Resignation</h3>
                        <form onSubmit={handleRejectSubmit}>
                            <div style={{ marginBottom: 22 }}>
                                <label style={lbl}>Rejection Reason <span style={{ color: "#ef4444" }}>*</span></label>
                                <textarea required rows="4" style={{ ...inp, resize: "vertical" }} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                                <button type="button" onClick={() => setShowRejectModal(false)} style={{ padding: "8px 16px", background: "var(--theme-bg,#f1f5f9)", color: "var(--theme-text,#475569)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                                <button type="submit" disabled={isProcessing} style={{ padding: "8px 18px", background: "#b91c1c", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, opacity: isProcessing ? 0.7 : 1 }}>{isProcessing ? "Processing..." : "Reject Request"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showOverrideModal && (
                <div style={overlay}>
                    <div style={mbox}>
                        <h3 style={{ margin: "0 0 8px", color: "var(--theme-text-strong,#1e293b)" }}>Override Last Working Date</h3>
                        <p style={{ fontSize: 13, color: "var(--theme-text-muted,#64748b)", marginBottom: 18 }}>Current LWD for <strong>{selectedRequest?.first_name}</strong>: {fmtDate(selectedRequest?.revised_last_working_date || selectedRequest?.original_last_working_date)}</p>
                        <form onSubmit={handleOverrideSubmit}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={lbl}>New Last Working Date <span style={{ color: "#ef4444" }}>*</span></label>
                                <input type="date" required style={inp} value={overrideData.revised_last_working_date} onChange={e => setOverrideData(p => ({ ...p, revised_last_working_date: e.target.value }))} />
                            </div>
                            <div style={{ marginBottom: 22 }}>
                                <label style={lbl}>Override Reason <span style={{ color: "#ef4444" }}>*</span></label>
                                <textarea required rows="3" style={{ ...inp, resize: "vertical" }} value={overrideData.override_reason} onChange={e => setOverrideData(p => ({ ...p, override_reason: e.target.value }))} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                                <button type="button" onClick={() => setShowOverrideModal(false)} style={{ padding: "8px 16px", background: "var(--theme-bg,#f1f5f9)", color: "var(--theme-text,#475569)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                                <button type="submit" disabled={isProcessing} style={{ padding: "8px 18px", background: "#d97706", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, opacity: isProcessing ? 0.7 : 1 }}>{isProcessing ? "Saving..." : "Update LWD"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResignationRequests;
