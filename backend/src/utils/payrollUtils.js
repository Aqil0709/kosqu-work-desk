/**
 * payrollUtils.js
 * Centralized utility for all salary and payroll component calculations.
 * This is the single source of truth for deriving salary components from gross pay.
 */

function buildSalaryComponents(employeeDetails) {
  const ed = employeeDetails;
  const annualCTC = Number(ed.salary || 0);
  const monthlyGross = Math.round(annualCTC / 12) || Number(ed.salary_gross || 0);

  let basic   = Math.round(Number(ed.salary_basic   || 0));
  let hra     = Math.round(Number(ed.salary_hra     || 0));
  let travel  = Math.round(Number(ed.salary_travel_allowance  || 0));
  let medical = Math.round(Number(ed.salary_medical_allowance || 0));
  let special = Math.round(Number(ed.salary_other_allowance   || 0));
  let pf      = Math.round(Number(ed.salary_pf      || 0));
  let esic    = Math.round(Number(ed.salary_esic    || 0));
  let pt      = Math.round(Number(ed.salary_professional_tax  || 0));
  let tds     = Math.round(Number(ed.tds_amount     || 0));

  // Derive components from gross if not set
  if (basic === 0 && monthlyGross > 0) {
    basic   = Math.round(monthlyGross * 0.40);
    hra     = Math.round(monthlyGross * 0.20);
    travel  = 950;
    medical = 1250;
    special = Math.max(0, monthlyGross - basic - hra - travel - medical);
  }

  const gross = basic + hra + travel + medical + special;
  if (pf === 0 && gross > 0 && Number(ed.pf_applicable || 0)) {
    pf = Math.round(basic * 0.12);
    esic = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
  }
  if (pt === 0 && gross > 0) pt = 200;

  const totalDeductions = pf + esic + pt + tds;
  const net = Math.max(0, gross - totalDeductions);

  return { basic, hra, travel, medical, special, gross, pf, esic, pt, tds, totalDeductions, net };
}

module.exports = { buildSalaryComponents };