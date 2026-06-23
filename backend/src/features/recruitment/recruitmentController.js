const { pool } = require('../../config/db');
const path = require('path');
const fs = require('fs');
const { sendNotification, getHRAndAdmins } = require('../notifications/notificationHelper');

// ── Job Postings ────────────────────────────────────────────────────────────
async function listJobs(req, res) {
  try {
    const { status, department } = req.query;
    let sql = 'SELECT j.*, CONCAT(u.first_name," ",u.last_name) AS created_by_name FROM job_postings j JOIN users u ON u.id=j.created_by WHERE j.tenant_id=?';
    const params = [req.tenantId];
    if (status) { sql += ' AND j.status=?'; params.push(status); }
    if (department) { sql += ' AND j.department=?'; params.push(department); }
    sql += ' ORDER BY j.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, jobs: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function getJob(req, res) {
  try {
    const [[job]] = await pool.execute('SELECT * FROM job_postings WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const [candidates] = await pool.execute('SELECT stage, COUNT(*) as count FROM candidates WHERE job_id=? AND tenant_id=? GROUP BY stage', [req.params.id, req.tenantId]);
    res.json({ success: true, job, pipeline: candidates });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function createJob(req, res) {
  try {
    const { title, department, location, job_type, experience_min, experience_max, salary_min, salary_max, description, requirements, skills, openings, status, closing_date } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO job_postings (tenant_id, title, department, location, job_type, experience_min, experience_max, salary_min, salary_max, description, requirements, skills, openings, status, closing_date, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [req.tenantId, title, department, location, job_type||'full_time', experience_min||0, experience_max, salary_min, salary_max, description, requirements, skills, openings||1, status||'draft', closing_date||null, req.user.id]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function updateJob(req, res) {
  try {
    const fields = ['title','department','location','job_type','experience_min','experience_max','salary_min','salary_max','description','requirements','skills','openings','status','closing_date'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f}=?`); values.push(req.body[f]); }
    }
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    values.push(req.params.id, req.tenantId);
    await pool.execute(`UPDATE job_postings SET ${updates.join(',')} WHERE id=? AND tenant_id=?`, values);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function deleteJob(req, res) {
  try {
    await pool.execute('UPDATE job_postings SET status="closed" WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── Candidates ──────────────────────────────────────────────────────────────
async function listCandidates(req, res) {
  try {
    const { job_id, stage, source } = req.query;
    let sql = `SELECT c.*, j.title AS job_title,
               CONCAT(u.first_name," ",u.last_name) AS assigned_to_name
               FROM candidates c
               JOIN job_postings j ON j.id=c.job_id
               LEFT JOIN users u ON u.id=c.assigned_to
               WHERE c.tenant_id=?`;
    const params = [req.tenantId];
    if (job_id) { sql += ' AND c.job_id=?'; params.push(job_id); }
    if (stage)  { sql += ' AND c.stage=?';  params.push(stage); }
    if (source) { sql += ' AND c.source=?'; params.push(source); }
    sql += ' ORDER BY c.applied_at DESC';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, candidates: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function getCandidate(req, res) {
  try {
    const [[c]] = await pool.execute(`
      SELECT c.*, j.title AS job_title FROM candidates c
      JOIN job_postings j ON j.id=c.job_id
      WHERE c.id=? AND c.tenant_id=?
    `, [req.params.id, req.tenantId]);
    if (!c) return res.status(404).json({ success: false, message: 'Candidate not found' });
    const [interviews] = await pool.execute('SELECT * FROM interviews WHERE candidate_id=? AND tenant_id=? ORDER BY scheduled_at', [req.params.id, req.tenantId]);
    const [offer] = await pool.execute('SELECT * FROM recruitment_offers WHERE candidate_id=? AND tenant_id=? ORDER BY created_at DESC LIMIT 1', [req.params.id, req.tenantId]);
    res.json({ success: true, candidate: c, interviews, offer: offer[0] || null });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function addCandidate(req, res) {
  try {
    const { job_id, name, email, phone, current_company, current_designation, experience_years, current_salary, expected_salary, notice_period, source, skills, cover_note } = req.body;
    let resumePath = null;
    let resumeName = null;
    if (req.file) {
      const dir = path.join(__dirname, '../../features/uploads/resumes', String(req.tenantId));
      fs.mkdirSync(dir, { recursive: true });
      resumeName = `${Date.now()}_${req.file.originalname}`;
      resumePath = path.join(dir, resumeName);
      fs.writeFileSync(resumePath, req.file.buffer);
      resumePath = `uploads/resumes/${req.tenantId}/${resumeName}`;
    }
    const [r] = await pool.execute(
      'INSERT INTO candidates (tenant_id, job_id, name, email, phone, current_company, current_designation, experience_years, current_salary, expected_salary, notice_period, source, resume_path, resume_name, skills, cover_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [req.tenantId, job_id, name, email, phone, current_company, current_designation, experience_years, current_salary, expected_salary, notice_period, source||'direct', resumePath, resumeName, skills, cover_note]
    );
    // Notify HR
    const hrs = await getHRAndAdmins(req.tenantId);
    for (const hr of hrs) {
      await sendNotification(req.tenantId, hr.id, { title: 'New Candidate Applied', message: `${name} applied for ${job_id}`, type: 'recruitment', related_id: r.insertId });
    }
    res.status(201).json({ success: true, id: r.insertId });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function updateCandidateStage(req, res) {
  try {
    const { stage, notes, rating, assigned_to } = req.body;
    const updates = [];
    const vals = [];
    if (stage !== undefined)       { updates.push('stage=?');       vals.push(stage); }
    if (notes !== undefined)       { updates.push('notes=?');       vals.push(notes); }
    if (rating !== undefined)      { updates.push('rating=?');      vals.push(rating); }
    if (assigned_to !== undefined) { updates.push('assigned_to=?'); vals.push(assigned_to); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    vals.push(req.params.id, req.tenantId);
    await pool.execute(`UPDATE candidates SET ${updates.join(',')} WHERE id=? AND tenant_id=?`, vals);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── Interviews ──────────────────────────────────────────────────────────────
async function scheduleInterview(req, res) {
  try {
    const { candidate_id, job_id, round, round_name, scheduled_at, duration_mins, interview_type, meet_link, interviewers } = req.body;
    const [r] = await pool.execute(
      'INSERT INTO interviews (tenant_id, candidate_id, job_id, round, round_name, scheduled_at, duration_mins, interview_type, meet_link, interviewers, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [req.tenantId, candidate_id, job_id, round||1, round_name||'Interview', scheduled_at, duration_mins||60, interview_type||'video', meet_link, JSON.stringify(interviewers||[]), req.user.id]
    );
    // Update candidate stage
    await pool.execute("UPDATE candidates SET stage='interview' WHERE id=? AND tenant_id=?", [candidate_id, req.tenantId]);
    res.status(201).json({ success: true, id: r.insertId });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function updateInterview(req, res) {
  try {
    const { status, feedback, rating, outcome } = req.body;
    await pool.execute(
      'UPDATE interviews SET status=?, feedback=?, rating=?, outcome=? WHERE id=? AND tenant_id=?',
      [status, feedback, rating, outcome, req.params.id, req.tenantId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── Offers ──────────────────────────────────────────────────────────────────
async function createOffer(req, res) {
  try {
    const { candidate_id, job_id, offered_salary, joining_date, offer_date, expiry_date, notes } = req.body;
    const [r] = await pool.execute(
      'INSERT INTO recruitment_offers (tenant_id, candidate_id, job_id, offered_salary, joining_date, offer_date, expiry_date, notes, status, created_by) VALUES (?,?,?,?,?,?,?,?,"sent",?)',
      [req.tenantId, candidate_id, job_id, offered_salary, joining_date, offer_date, expiry_date, notes, req.user.id]
    );
    await pool.execute("UPDATE candidates SET stage='offer' WHERE id=? AND tenant_id=?", [candidate_id, req.tenantId]);
    res.status(201).json({ success: true, id: r.insertId });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function updateOfferStatus(req, res) {
  try {
    const { status, notes } = req.body;
    await pool.execute('UPDATE recruitment_offers SET status=?, notes=? WHERE id=? AND tenant_id=?', [status, notes, req.params.id, req.tenantId]);
    if (status === 'accepted') {
      const [[offer]] = await pool.execute('SELECT candidate_id FROM recruitment_offers WHERE id=?', [req.params.id]);
      if (offer) await pool.execute("UPDATE candidates SET stage='selected' WHERE id=? AND tenant_id=?", [offer.candidate_id, req.tenantId]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── ATS Analytics ───────────────────────────────────────────────────────────
async function getATSStats(req, res) {
  try {
    const [jobStats] = await pool.execute(
      'SELECT status, COUNT(*) as count FROM job_postings WHERE tenant_id=? GROUP BY status', [req.tenantId]
    );
    const [stageStats] = await pool.execute(
      'SELECT stage, COUNT(*) as count FROM candidates WHERE tenant_id=? GROUP BY stage', [req.tenantId]
    );
    const [sourceStats] = await pool.execute(
      'SELECT source, COUNT(*) as count FROM candidates WHERE tenant_id=? GROUP BY source', [req.tenantId]
    );
    const [[totals]] = await pool.execute(
      'SELECT COUNT(*) as total_candidates, SUM(stage="selected") as selected, SUM(stage="rejected") as rejected FROM candidates WHERE tenant_id=?', [req.tenantId]
    );
    res.json({ success: true, jobStats, stageStats, sourceStats, totals });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

module.exports = { listJobs, getJob, createJob, updateJob, deleteJob, listCandidates, getCandidate, addCandidate, updateCandidateStage, scheduleInterview, updateInterview, createOffer, updateOfferStatus, getATSStats };
