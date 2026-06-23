const { pool } = require('../../config/db');
const { computeAnnualTax, monthlyTDS, computePF, computeESIC, computePT } = require('./taxEngine');

// Helper: get financial year string (e.g. "2024-25")
function getFY(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
}

// Helper: get employee salary details
async function getEmployeeSalaryDetails(tenantId, employeeId) {
  const [rows] = await pool.execute(
    `SELECT ss.*, ed.uan_number, ed.esic_number, ed.pan_number, ed.state_code,
            CONCAT(u.first_name,' ',u.last_name) AS name,
            u.email
     FROM salary_structures ss
     JOIN employee_details ed ON ed.employee_id = ss.employee_id AND ed.tenant_id = ss.tenant_id
     JOIN users u ON u.id = ss.employee_id
     WHERE ss.tenant_id = ? AND ss.employee_id = ?
     ORDER BY ss.effective_from DESC LIMIT 1`,
    [tenantId, employeeId]
  );
  return rows[0] || null;
}

const complianceController = {
  // ── GET compliance settings ─────────────────────────────────────────────────
  getSettings: async (req, res) => {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM payroll_compliance_settings WHERE tenant_id=?', [req.tenantId]
      );
      res.json({ success: true, settings: rows[0] || { pf_applicable: 1, esic_applicable: 1, pt_state: 'MH', default_regime: 'new' } });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  saveSettings: async (req, res) => {
    try {
      const { pf_applicable, esic_applicable, pt_state, default_regime, pf_wage_ceiling, esic_wage_ceiling } = req.body;
      await pool.execute(`
        INSERT INTO payroll_compliance_settings (tenant_id, pf_applicable, esic_applicable, pt_state, default_regime, pf_wage_ceiling, esic_wage_ceiling)
        VALUES (?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE pf_applicable=VALUES(pf_applicable), esic_applicable=VALUES(esic_applicable),
          pt_state=VALUES(pt_state), default_regime=VALUES(default_regime),
          pf_wage_ceiling=VALUES(pf_wage_ceiling), esic_wage_ceiling=VALUES(esic_wage_ceiling)
      `, [req.tenantId, pf_applicable ?? 1, esic_applicable ?? 1, pt_state || 'MH', default_regime || 'new', pf_wage_ceiling || 15000, esic_wage_ceiling || 21000]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── Investment Declaration (12BB) ───────────────────────────────────────────
  getMyDeclaration: async (req, res) => {
    try {
      const fy = req.query.fy || getFY();
      const [rows] = await pool.execute(
        'SELECT * FROM investment_declarations WHERE tenant_id=? AND employee_id=? AND financial_year=?',
        [req.tenantId, req.user.id, fy]
      );
      res.json({ success: true, declaration: rows[0] || null, fy });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  saveMyDeclaration: async (req, res) => {
    try {
      const fy = req.body.financial_year || getFY();
      const { sec_80c=0, sec_80d=0, sec_80e=0, sec_80g=0, sec_80tta=0, hra_claimed=0, lta_claimed=0, other_deductions=0 } = req.body;
      await pool.execute(`
        INSERT INTO investment_declarations
          (tenant_id, employee_id, financial_year, sec_80c, sec_80d, sec_80e, sec_80g, sec_80tta, hra_claimed, lta_claimed, other_deductions, declaration_date, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,CURDATE(),'submitted')
        ON DUPLICATE KEY UPDATE
          sec_80c=VALUES(sec_80c), sec_80d=VALUES(sec_80d), sec_80e=VALUES(sec_80e), sec_80g=VALUES(sec_80g),
          sec_80tta=VALUES(sec_80tta), hra_claimed=VALUES(hra_claimed), lta_claimed=VALUES(lta_claimed),
          other_deductions=VALUES(other_deductions), declaration_date=CURDATE(), status='submitted'
      `, [req.tenantId, req.user.id, fy, sec_80c, sec_80d, sec_80e, sec_80g, sec_80tta, hra_claimed, lta_claimed, other_deductions]);
      res.json({ success: true, message: 'Declaration submitted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getAllDeclarations: async (req, res) => {
    try {
      const fy = req.query.fy || getFY();
      const [rows] = await pool.execute(`
        SELECT d.*, CONCAT(u.first_name,' ',u.last_name) AS employee_name, u.email
        FROM investment_declarations d
        JOIN users u ON u.id = d.employee_id
        WHERE d.tenant_id=? AND d.financial_year=?
        ORDER BY d.updated_at DESC
      `, [req.tenantId, fy]);
      res.json({ success: true, declarations: rows, fy });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  approveDeclaration: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body; // 'approved' or 'rejected'
      await pool.execute(
        'UPDATE investment_declarations SET status=?, remarks=?, approved_by=? WHERE id=? AND tenant_id=?',
        [status, remarks || null, req.user.id, id, req.tenantId]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── TDS Computation ─────────────────────────────────────────────────────────
  computeTDS: async (req, res) => {
    try {
      const { employee_id, financial_year, regime = 'new' } = req.body;
      const fy = financial_year || getFY();
      const tenantId = req.tenantId;

      // Get salary
      const [salRows] = await pool.execute(
        `SELECT basic_salary, hra, gross_salary FROM salary_structures WHERE tenant_id=? AND employee_id=? ORDER BY effective_from DESC LIMIT 1`,
        [tenantId, employee_id]
      );
      if (!salRows.length) return res.status(404).json({ success: false, message: 'No salary structure found' });

      const sal = salRows[0];
      const annualGross = Number(sal.gross_salary || 0) * 12;

      // Get approved investment declaration
      const [decl] = await pool.execute(
        `SELECT * FROM investment_declarations WHERE tenant_id=? AND employee_id=? AND financial_year=? AND status='approved'`,
        [tenantId, employee_id, fy]
      );
      const d = decl[0] || {};
      const totalDeductions = Number(d.sec_80c||0) + Number(d.sec_80d||0) + Number(d.sec_80e||0) +
                              Number(d.sec_80g||0) + Number(d.sec_80tta||0) + Number(d.hra_claimed||0) +
                              Number(d.lta_claimed||0) + Number(d.other_deductions||0);

      const result = computeAnnualTax(annualGross, regime, { total: totalDeductions });
      const monthlyTds = Math.round(result.totalTax / 12);

      res.json({ success: true, fy, regime, annualGross, ...result, monthlyTds });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── Form 16 Generation ──────────────────────────────────────────────────────
  generateForm16: async (req, res) => {
    try {
      const { employee_id, financial_year } = req.params;
      const fy = financial_year || getFY();
      const tenantId = req.tenantId;

      const [salRows] = await pool.execute(
        `SELECT ss.*, CONCAT(u.first_name,' ',u.last_name) AS emp_name, u.email,
                ed.pan_number, ed.designation
         FROM salary_structures ss
         JOIN users u ON u.id = ss.employee_id
         LEFT JOIN employee_details ed ON ed.employee_id = ss.employee_id AND ed.tenant_id = ss.tenant_id
         WHERE ss.tenant_id=? AND ss.employee_id=?
         ORDER BY ss.effective_from DESC LIMIT 1`,
        [tenantId, employee_id]
      );
      if (!salRows.length) return res.status(404).json({ success: false, message: 'No salary data found' });

      const emp = salRows[0];
      const annualGross = Number(emp.gross_salary || 0) * 12;

      const [tds] = await pool.execute(
        `SELECT SUM(tds_deducted) AS total_tds FROM tds_computations WHERE tenant_id=? AND employee_id=? AND financial_year=?`,
        [tenantId, employee_id, fy]
      );

      const [decl] = await pool.execute(
        `SELECT * FROM investment_declarations WHERE tenant_id=? AND employee_id=? AND financial_year=?`,
        [tenantId, employee_id, fy]
      );
      const d = decl[0] || {};

      const [branding] = await pool.execute(
        'SELECT company_name, company_address, company_email FROM company_branding WHERE tenant_id=? LIMIT 1',
        [tenantId]
      );
      const company = branding[0] || {};

      res.json({
        success: true,
        form16: {
          financial_year: fy,
          employee: { name: emp.emp_name, pan: emp.pan_number, designation: emp.designation, email: emp.email },
          employer: { name: company.company_name, address: company.company_address, email: company.company_email },
          income: {
            gross_salary: annualGross,
            hra_exempt: Number(d.hra_claimed || 0),
            lta_exempt: Number(d.lta_claimed || 0),
            standard_deduction: 75000,
            total_income: Math.max(0, annualGross - Number(d.hra_claimed||0) - Number(d.lta_claimed||0) - 75000),
          },
          deductions: {
            sec_80c: Number(d.sec_80c || 0),
            sec_80d: Number(d.sec_80d || 0),
            sec_80e: Number(d.sec_80e || 0),
            sec_80g: Number(d.sec_80g || 0),
            sec_80tta: Number(d.sec_80tta || 0),
          },
          tax: {
            tds_deducted: Number(tds[0]?.total_tds || 0),
          },
          generated_at: new Date().toISOString(),
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── PF ECR Report ───────────────────────────────────────────────────────────
  getPFECR: async (req, res) => {
    try {
      const { month } = req.query; // format: "2024-06"
      const tenantId = req.tenantId;

      if (!month) {
        return res.json({ success: true, month: null, records: [], totals: { pf_wages: 0, employee_pf: 0, employer_eps: 0, employer_epf: 0, total_liability: 0 } });
      }

      const [rows] = await pool.execute(`
        SELECT pf.*, CONCAT(u.first_name,' ',u.last_name) AS name, ed.uan_number, u.email
        FROM pf_contributions pf
        JOIN users u ON u.id = pf.employee_id
        LEFT JOIN employee_details ed ON CAST(ed.employee_id AS UNSIGNED) = pf.employee_id AND ed.tenant_id = pf.tenant_id
        WHERE pf.tenant_id=? AND pf.month=?
        ORDER BY u.first_name
      `, [tenantId, month]);

      const totals = rows.reduce((acc, r) => ({
        pf_wages: acc.pf_wages + Number(r.pf_wages),
        employee_pf: acc.employee_pf + Number(r.employee_pf),
        employer_eps: acc.employer_eps + Number(r.employer_eps),
        employer_epf: acc.employer_epf + Number(r.employer_epf),
        total_liability: acc.total_liability + Number(r.total_liability),
      }), { pf_wages: 0, employee_pf: 0, employer_eps: 0, employer_epf: 0, total_liability: 0 });

      res.json({ success: true, month, records: rows, totals });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── ESIC Report ─────────────────────────────────────────────────────────────
  getESICReport: async (req, res) => {
    try {
      const { month } = req.query;
      const tenantId = req.tenantId;

      if (!month) {
        return res.json({ success: true, month: null, records: [], totals: { gross_wages: 0, employee_esic: 0, employer_esic: 0, total_esic: 0 } });
      }

      const [rows] = await pool.execute(`
        SELECT e.*, CONCAT(u.first_name,' ',u.last_name) AS name, ed.esic_number
        FROM esic_contributions e
        JOIN users u ON u.id = e.employee_id
        LEFT JOIN employee_details ed ON CAST(ed.employee_id AS UNSIGNED) = e.employee_id AND ed.tenant_id = e.tenant_id
        WHERE e.tenant_id=? AND e.month=? AND e.is_esic_eligible=1
        ORDER BY u.first_name
      `, [tenantId, month]);

      const totals = rows.reduce((acc, r) => ({
        gross_wages: acc.gross_wages + Number(r.gross_wages),
        employee_esic: acc.employee_esic + Number(r.employee_esic),
        employer_esic: acc.employer_esic + Number(r.employer_esic),
        total_esic: acc.total_esic + Number(r.total_esic),
      }), { gross_wages: 0, employee_esic: 0, employer_esic: 0, total_esic: 0 });

      res.json({ success: true, month, records: rows, totals });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── PT Report ───────────────────────────────────────────────────────────────
  getPTReport: async (req, res) => {
    try {
      const { month } = req.query;
      const tenantId = req.tenantId;

      const [rows] = await pool.execute(`
        SELECT pt.*, CONCAT(u.first_name,' ',u.last_name) AS name
        FROM professional_tax pt
        JOIN users u ON u.id = pt.employee_id
        WHERE pt.tenant_id=? AND pt.month=?
        ORDER BY u.first_name
      `, [tenantId, month]);

      const totalPT = rows.reduce((a, r) => a + Number(r.pt_deducted), 0);
      res.json({ success: true, month, records: rows, total_pt: totalPT });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── Form 24Q Data Export ─────────────────────────────────────────────────────
  getForm24QData: async (req, res) => {
    try {
      const { quarter, financial_year } = req.query;
      const fy = financial_year || getFY();
      const tenantId = req.tenantId;

      const quarterMap = { Q1: [4,5,6], Q2: [7,8,9], Q3: [10,11,12], Q4: [1,2,3] };
      const months = quarterMap[quarter] || quarterMap.Q1;

      const [rows] = await pool.execute(`
        SELECT t.*, CONCAT(u.first_name,' ',u.last_name) AS name,
               ed.pan_number, ed.designation
        FROM tds_computations t
        JOIN users u ON u.id = t.employee_id
        LEFT JOIN employee_details ed ON ed.employee_id = t.employee_id AND ed.tenant_id = t.tenant_id
        WHERE t.tenant_id=? AND t.financial_year=? AND t.month IN (${months.map(()=>'?').join(',')})
        ORDER BY u.first_name, t.month
      `, [tenantId, fy, ...months]);

      const totalTDS = rows.reduce((a, r) => a + Number(r.tds_deducted), 0);
      res.json({ success: true, fy, quarter, records: rows, total_tds: totalTDS });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ── Process monthly compliance (called during payroll processing) ────────────
  processMonthlyCompliance: async (req, res) => {
    try {
      const { month, employee_ids } = req.body; // month: "2024-06", employee_ids: [1,2,3]
      const tenantId = req.tenantId;

      const [settings] = await pool.execute(
        'SELECT * FROM payroll_compliance_settings WHERE tenant_id=?', [tenantId]
      );
      const cfg = settings[0] || { pf_applicable: 1, esic_applicable: 1, pt_state: 'MH', default_regime: 'new' };

      const monthNum = parseInt(month.split('-')[1]);
      const results = [];

      for (const empId of employee_ids) {
        const [salRows] = await pool.execute(
          'SELECT * FROM salary_structures WHERE tenant_id=? AND employee_id=? ORDER BY effective_from DESC LIMIT 1',
          [tenantId, empId]
        );
        if (!salRows.length) continue;
        const sal = salRows[0];

        // PF
        if (cfg.pf_applicable) {
          const pf = computePF(Number(sal.basic_salary || 0), { pfCeiling: Number(cfg.pf_wage_ceiling || 15000) });
          await pool.execute(`
            INSERT INTO pf_contributions (tenant_id, employee_id, month, pf_wages, employee_pf, employer_eps, employer_epf, employer_edli, admin_charges, total_liability)
            VALUES (?,?,?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE pf_wages=VALUES(pf_wages), employee_pf=VALUES(employee_pf),
              employer_eps=VALUES(employer_eps), employer_epf=VALUES(employer_epf),
              employer_edli=VALUES(employer_edli), admin_charges=VALUES(admin_charges), total_liability=VALUES(total_liability)
          `, [tenantId, empId, month, pf.pfWages, pf.employeeEPF, pf.employerEPS, pf.employerEPF, pf.edli, pf.adminCharges, pf.totalLiability]);
        }

        // ESIC
        if (cfg.esic_applicable) {
          const esic = computeESIC(Number(sal.gross_salary || 0));
          await pool.execute(`
            INSERT INTO esic_contributions (tenant_id, employee_id, month, gross_wages, employee_esic, employer_esic, total_esic, is_esic_eligible)
            VALUES (?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE gross_wages=VALUES(gross_wages), employee_esic=VALUES(employee_esic),
              employer_esic=VALUES(employer_esic), total_esic=VALUES(total_esic), is_esic_eligible=VALUES(is_esic_eligible)
          `, [tenantId, empId, month, Number(sal.gross_salary||0), esic.employeeESIC||0, esic.employerESIC||0, esic.totalESIC||0, esic.eligible ? 1 : 0]);
        }

        // PT
        const pt = computePT(Number(sal.gross_salary || 0), cfg.pt_state || 'MH', monthNum);
        await pool.execute(`
          INSERT INTO professional_tax (tenant_id, employee_id, month, state_code, gross_salary, pt_deducted)
          VALUES (?,?,?,?,?,?)
          ON DUPLICATE KEY UPDATE gross_salary=VALUES(gross_salary), pt_deducted=VALUES(pt_deducted)
        `, [tenantId, empId, month, pt.state, pt.grossMonthly, pt.ptDeducted]);

        results.push({ employee_id: empId, status: 'processed' });
      }

      res.json({ success: true, month, processed: results.length, results });
    } catch (err) {
      console.error('[Compliance] processMonthly error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },
};

module.exports = complianceController;
