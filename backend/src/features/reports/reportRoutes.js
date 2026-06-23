const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const requireAdmin = require('../../middleware/requireAdmin');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const reportController = require('./reportController');
const reportModel = require('./reportModel');
const { pool } = require('../../config/db');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

router.use(verifyToken);

router.get('/my', reportController.getMyReports);
router.post('/my', reportController.createMyReport);

// ── GET /api/reports/team-excel ───────────────────────────────────────────────
// Accessible to admin and HR (anyone with work_reports read access)
router.get('/team-excel', requireModuleAccess('work_reports', 'read'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { start_date, end_date, month, year, team_lead_id } = req.query;

    // Build date filter
    let dateFilter = '';
    const dateParams = [];

    if (start_date && end_date) {
      dateFilter = 'AND wr.report_date BETWEEN ? AND ?';
      dateParams.push(start_date, end_date);
    } else if (month && year) {
      dateFilter = 'AND MONTH(wr.report_date) = ? AND YEAR(wr.report_date) = ?';
      dateParams.push(Number(month), Number(year));
    } else {
      const now = new Date();
      dateFilter = 'AND MONTH(wr.report_date) = ? AND YEAR(wr.report_date) = ?';
      dateParams.push(now.getMonth() + 1, now.getFullYear());
    }

    // Build employee query with optional team filter
    let empWhere = `WHERE u.tenant_id = ? AND u.is_active = 1
         AND LOWER(u.position) NOT IN ('admin','hr','client','super_admin','superadmin')`;
    const empParams = [tenantId];
    if (team_lead_id === 'none') {
      empWhere += ' AND (ed.team_lead_id IS NULL OR ed.team_lead_id = 0)';
    } else if (team_lead_id) {
      empWhere += ' AND ed.team_lead_id = ?';
      empParams.push(Number(team_lead_id));
    }

    // Get active employees with their team lead info
    const [employees] = await pool.execute(
      `SELECT u.id as user_id,
              CONCAT(u.first_name,' ',u.last_name) as emp_name,
              u.position, u.email,
              ed.id as emp_number, ed.department_id,
              ed.team_lead_id,
              tl.first_name as tl_first, tl.last_name as tl_last,
              d.name as department_name
       FROM users u
       JOIN employee_details ed ON CAST(ed.employee_id AS UNSIGNED) = u.id AND ed.tenant_id = u.tenant_id
       LEFT JOIN users tl ON tl.id = ed.team_lead_id
       LEFT JOIN departments d ON d.id = ed.department_id AND d.tenant_id = u.tenant_id
       ${empWhere}
       ORDER BY COALESCE(tl.first_name,'zzz'), u.first_name`,
      empParams
    );

    if (employees.length === 0) {
      return res.status(404).json({ success: false, message: 'No employees found' });
    }

    const wb = XLSX.utils.book_new();

    for (const emp of employees) {
      // Fetch work reports for this employee
      const [reports] = await pool.execute(
        `SELECT wr.report_date, wr.task_title, wr.project_name,
                wr.work_done, wr.challenges, wr.tomorrow_plan,
                wr.hours_worked, wr.status, wr.manager_feedback
         FROM work_reports wr
         WHERE wr.tenant_id = ? AND wr.user_id = ?
         ${dateFilter}
         ORDER BY wr.report_date ASC`,
        [tenantId, emp.user_id, ...dateParams]
      );

      const teamLeadName = emp.tl_first
        ? `${emp.tl_first} ${emp.tl_last || ''}`.trim()
        : 'No Team Lead';

      const wsData = [
        [`Employee: ${emp.emp_name}`, '', '', '', '', '', '', ''],
        [`Position: ${emp.position || '—'}`, '', '', '', '', '', '', ''],
        [`Team Lead: ${teamLeadName}`, '', '', '', '', '', '', ''],
        [`Department: ${emp.department_name || '—'}`, '', '', '', '', '', '', ''],
        [],
        ['Date', 'Project', 'Task', 'Work Done', 'Challenges', 'Tomorrow Plan', 'Hours', 'Status'],
        ...reports.map(r => [
          r.report_date ? new Date(r.report_date).toLocaleDateString('en-IN') : '',
          r.project_name || '',
          r.task_title   || '',
          r.work_done    || '',
          r.challenges   || '',
          r.tomorrow_plan || '',
          r.hours_worked || 0,
          (r.status || 'draft').replace(/_/g, ' '),
        ]),
        [],
        [
          `Total Reports: ${reports.length}`,
          '', '', '', '',
          `Total Hours: ${reports.reduce((s, r) => s + Number(r.hours_worked || 0), 0)}`,
          '', '',
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 13 }, { wch: 18 }, { wch: 26 }, { wch: 38 },
        { wch: 28 }, { wch: 28 }, { wch:  7 }, { wch: 14 },
      ];
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
      ];

      // Sheet name: employee name, max 31 chars, no special chars
      const sheetName = emp.emp_name.replace(/[\\/*?[\]:]/g, '').slice(0, 31).trim() || `Emp_${emp.user_id}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const now = new Date();
    const fileName = `Team_Work_Reports_${now.getFullYear()}_${String(now.getMonth()+1).padStart(2,'0')}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('[TeamExcel] error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate Excel report' });
  }
});

// ── GET /api/reports/team-pdf ─────────────────────────────────────────────────
// PDF export of team work reports (Admin/HR/TL with work_reports read access)
router.get('/team-pdf', requireModuleAccess('work_reports', 'read'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { start_date, end_date, month, year, team_lead_id } = req.query;

    let dateFilter = '';
    const dateParams = [];
    if (start_date && end_date) {
      dateFilter = 'AND wr.report_date BETWEEN ? AND ?';
      dateParams.push(start_date, end_date);
    } else if (month && year) {
      dateFilter = 'AND MONTH(wr.report_date) = ? AND YEAR(wr.report_date) = ?';
      dateParams.push(Number(month), Number(year));
    } else {
      const now = new Date();
      dateFilter = 'AND MONTH(wr.report_date) = ? AND YEAR(wr.report_date) = ?';
      dateParams.push(now.getMonth() + 1, now.getFullYear());
    }

    let empWhere = `WHERE u.tenant_id = ? AND u.is_active = 1
         AND LOWER(u.position) NOT IN ('admin','hr','client','super_admin','superadmin')`;
    const empParams = [tenantId];
    if (team_lead_id === 'none') {
      empWhere += ' AND (ed.team_lead_id IS NULL OR ed.team_lead_id = 0)';
    } else if (team_lead_id) {
      empWhere += ' AND ed.team_lead_id = ?';
      empParams.push(Number(team_lead_id));
    }
    // Team Lead scoping
    if (req.user.position === 'team_lead') {
      empWhere += ' AND ed.team_lead_id = ?';
      empParams.push(req.user.id);
    }

    const [employees] = await pool.execute(
      `SELECT u.id as user_id,
              CONCAT(u.first_name,' ',u.last_name) as emp_name,
              u.position, u.email,
              ed.id as emp_number,
              ed.team_lead_id,
              tl.first_name as tl_first, tl.last_name as tl_last,
              d.name as department_name
       FROM users u
       JOIN employee_details ed ON CAST(ed.employee_id AS UNSIGNED) = u.id AND ed.tenant_id = u.tenant_id
       LEFT JOIN users tl ON tl.id = ed.team_lead_id
       LEFT JOIN departments d ON d.id = ed.department_id AND d.tenant_id = u.tenant_id
       ${empWhere}
       ORDER BY COALESCE(tl.first_name,'zzz'), u.first_name`,
      empParams
    );

    if (employees.length === 0) {
      return res.status(404).json({ success: false, message: 'No employees found' });
    }

    // Get branding for watermark
    const [brandingRows] = await pool.execute(
      'SELECT company_name, watermark_enabled, watermark_opacity FROM tenant_branding WHERE tenant_id = ? LIMIT 1',
      [tenantId]
    );
    const branding = brandingRows[0] || {};
    const companyName = branding.company_name || 'Company';
    const watermarkEnabled = branding.watermark_enabled !== 0;
    const watermarkOpacity = Number(branding.watermark_opacity || 0.07);

    // Build period label
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const periodLabel = month && year
      ? `${monthNames[Number(month)-1]} ${year}`
      : start_date && end_date
        ? `${start_date} to ${end_date}`
        : `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;

    const doc = new PDFDocument({ margin: 48, size: 'A4', info: { Title: 'Work Report', Author: companyName } });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Team_Work_Reports_${periodLabel.replace(/\s+/g,'_')}.pdf"`);
    doc.pipe(res);

    const PRIMARY = '#5B4FF7';
    const GRAY    = '#64748b';
    const LIGHT   = '#f8fafc';
    const pageW   = doc.page.width;
    const usableW = pageW - 96;

    const drawWatermark = () => {
      if (!watermarkEnabled) return;
      doc.save();
      doc.opacity(watermarkOpacity);
      doc.fontSize(52).fillColor(PRIMARY);
      const text = companyName.toUpperCase();
      const tw = doc.widthOfString(text, { fontSize: 52 });
      const th = 52;
      const cx = (pageW) / 2 - tw / 2;
      const cy = (doc.page.height) / 2 - th / 2;
      doc.rotate(-35, { origin: [pageW / 2, doc.page.height / 2] });
      doc.text(text, cx, cy, { lineBreak: false });
      doc.restore();
    };

    // ── Cover page ──
    drawWatermark();
    doc.fontSize(22).fillColor(PRIMARY).font('Helvetica-Bold')
      .text('WORK REPORT', 48, 120, { align: 'center' });
    doc.fontSize(14).fillColor(GRAY).font('Helvetica')
      .text(companyName, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor(GRAY).text(`Period: ${periodLabel}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Total Employees: ${employees.length}`, { align: 'center' });
    doc.moveDown(4);

    // Summary table header
    doc.fontSize(13).fillColor(PRIMARY).font('Helvetica-Bold').text('Summary', 48);
    doc.moveDown(0.4);
    const sumCols = [200, 120, 100, 100];
    const sumHeaders = ['Employee', 'Department', 'Reports', 'Hours'];
    let sx = 48;
    doc.fontSize(9).fillColor('#fff');
    doc.rect(48, doc.y, usableW, 18).fill(PRIMARY);
    sumHeaders.forEach((h, i) => {
      doc.fillColor('#fff').text(h, sx + 4, doc.y - 16, { width: sumCols[i], lineBreak: false });
      sx += sumCols[i];
    });
    doc.moveDown(0.2);

    // We'll collect summary data while generating
    const summaryRows = [];
    let totalReports = 0;
    let totalHours = 0;

    for (const emp of employees) {
      const [reports] = await pool.execute(
        `SELECT wr.report_date, wr.task_title, wr.project_name,
                wr.work_done, wr.challenges, wr.tomorrow_plan,
                wr.hours_worked, wr.status
         FROM work_reports wr
         WHERE wr.tenant_id = ? AND wr.user_id = ?
         ${dateFilter}
         ORDER BY wr.report_date ASC`,
        [tenantId, emp.user_id, ...dateParams]
      );
      const empHours = reports.reduce((s, r) => s + Number(r.hours_worked || 0), 0);
      summaryRows.push({ name: emp.emp_name, dept: emp.department_name || '—', count: reports.length, hours: empHours });
      totalReports += reports.length;
      totalHours += empHours;
      emp._reports = reports;
    }

    let rowY = doc.y;
    let oddRow = false;
    for (const row of summaryRows) {
      if (oddRow) {
        doc.rect(48, rowY, usableW, 16).fill('#f1f5f9');
      }
      doc.fillColor('#334155').fontSize(8).font('Helvetica');
      let cx2 = 48;
      [row.name, row.dept, String(row.count), row.hours.toFixed(1)].forEach((v, i) => {
        doc.text(v.slice(0, 30), cx2 + 4, rowY + 4, { width: sumCols[i] - 8, lineBreak: false });
        cx2 += sumCols[i];
      });
      rowY += 16;
      doc.y = rowY;
      oddRow = !oddRow;
    }

    // Totals row
    doc.rect(48, doc.y, usableW, 18).fill(PRIMARY);
    doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold');
    let tx = 48;
    [`Total (${summaryRows.length} employees)`, '', String(totalReports), totalHours.toFixed(1)].forEach((v, i) => {
      doc.text(v, tx + 4, doc.y - 16, { width: sumCols[i], lineBreak: false });
      tx += sumCols[i];
    });
    doc.moveDown(1.5);

    // ── Per-employee pages ──
    for (const emp of employees) {
      doc.addPage();
      drawWatermark();

      const tlName = emp.tl_first ? `${emp.tl_first} ${emp.tl_last || ''}`.trim() : 'No Team Lead';

      doc.fontSize(14).fillColor(PRIMARY).font('Helvetica-Bold').text(emp.emp_name, 48, 60);
      doc.fontSize(9).fillColor(GRAY).font('Helvetica')
        .text(`${emp.position || '—'} | ${emp.department_name || '—'} | Team Lead: ${tlName}`, 48);
      doc.moveDown(0.5);

      const reports = emp._reports;
      if (reports.length === 0) {
        doc.fontSize(10).fillColor(GRAY).text('No reports submitted for this period.', 48);
      } else {
        // Table header
        const cols = [70, 100, 130, 180, 55, 70];
        const headers2 = ['Date', 'Project', 'Task', 'Work Done', 'Hours', 'Status'];
        const rowH = 14;
        let hy = doc.y;
        doc.rect(48, hy, usableW, 16).fill(PRIMARY);
        let hx = 48;
        doc.fillColor('#fff').fontSize(7.5).font('Helvetica-Bold');
        headers2.forEach((h, i) => {
          doc.text(h, hx + 3, hy + 5, { width: cols[i], lineBreak: false });
          hx += cols[i];
        });
        hy += 16;

        let alt = false;
        for (const r of reports) {
          const dateStr = r.report_date ? new Date(r.report_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
          if (alt) doc.rect(48, hy, usableW, rowH).fill('#f8fafc');
          doc.fillColor('#334155').fontSize(7).font('Helvetica');
          let rx = 48;
          [
            dateStr,
            (r.project_name || '—').slice(0, 20),
            (r.task_title || '—').slice(0, 30),
            (r.work_done || '—').slice(0, 55),
            String(r.hours_worked || 0),
            (r.status || 'draft').replace(/_/g, ' '),
          ].forEach((v, i) => {
            doc.text(v, rx + 3, hy + 4, { width: cols[i] - 4, lineBreak: false });
            rx += cols[i];
          });
          hy += rowH;
          alt = !alt;
          // New page if near bottom
          if (hy > doc.page.height - 80) {
            doc.addPage();
            drawWatermark();
            hy = 60;
          }
        }
        doc.y = hy;
        doc.moveDown(0.5);

        const totalEmpHours = reports.reduce((s, r) => s + Number(r.hours_worked || 0), 0);
        doc.fontSize(9).fillColor(PRIMARY).font('Helvetica-Bold')
          .text(`Total Reports: ${reports.length}   |   Total Hours: ${totalEmpHours.toFixed(1)}`, 48);
      }
    }

    doc.end();
  } catch (err) {
    console.error('[TeamPDF] error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
    }
  }
});

// Admin-only routes (full report management)
router.use(requireAdmin);

router.get('/employees', reportController.getEmployees);
router.get('/', reportController.getReports);
router.put('/:id/remark', reportController.updateRemark);

router.ensureSchema = reportModel.ensureReportSchema;

module.exports = router;
