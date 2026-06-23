/**
 * India Payroll Tax Engine
 * Covers TDS, PF, ESIC, Professional Tax computations
 * FY 2024-25 slabs
 */

// ── New Tax Regime slabs (FY 2024-25) ─────────────────────────────────────────
const NEW_REGIME_SLABS = [
  { upto: 300000,   rate: 0    },
  { upto: 700000,   rate: 0.05 },
  { upto: 1000000,  rate: 0.10 },
  { upto: 1200000,  rate: 0.15 },
  { upto: 1500000,  rate: 0.20 },
  { upto: Infinity, rate: 0.30 },
];

// ── Old Tax Regime slabs ───────────────────────────────────────────────────────
const OLD_REGIME_SLABS = [
  { upto: 250000,   rate: 0    },
  { upto: 500000,   rate: 0.05 },
  { upto: 1000000,  rate: 0.20 },
  { upto: Infinity, rate: 0.30 },
];

function computeTaxOnSlabs(income, slabs) {
  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (income <= prev) break;
    const taxable = Math.min(income, slab.upto) - prev;
    tax += taxable * slab.rate;
    prev = slab.upto;
    if (income <= slab.upto) break;
  }
  return Math.round(tax);
}

// Rebate u/s 87A
function applyRebate(tax, income, regime) {
  if (regime === 'new' && income <= 700000) return 0;
  if (regime === 'old' && income <= 500000) return 0;
  return tax;
}

// Surcharge
function computeSurcharge(tax, income) {
  if (income > 50000000) return tax * 0.37;
  if (income > 20000000) return tax * 0.25;
  if (income > 10000000) return tax * 0.15;
  if (income > 5000000)  return tax * 0.10;
  return 0;
}

/**
 * computeAnnualTax(annualIncome, regime, deductions)
 * Returns { taxableIncome, basicTax, surcharge, cess, totalTax }
 */
function computeAnnualTax(annualGross, regime = 'new', deductions = {}) {
  const standardDeduction = regime === 'new' ? 75000 : 50000; // FY 2024-25 new regime std ded = 75k
  const totalDeductions = standardDeduction + (deductions.total || 0);
  const taxableIncome = Math.max(0, annualGross - totalDeductions);

  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  let basicTax = computeTaxOnSlabs(taxableIncome, slabs);
  basicTax = applyRebate(basicTax, taxableIncome, regime);

  const surcharge = Math.round(computeSurcharge(basicTax, taxableIncome));
  const cess = Math.round((basicTax + surcharge) * 0.04); // 4% health & education cess
  const totalTax = basicTax + surcharge + cess;

  return { taxableIncome, standardDeduction, basicTax, surcharge, cess, totalTax };
}

/**
 * monthlyTDS(annualGross, regime, deductions, monthsRemaining, tdsPaidSoFar)
 * Returns monthly TDS to deduct
 */
function monthlyTDS(annualGross, regime = 'new', deductions = {}, monthsRemaining = 12, tdsPaidSoFar = 0) {
  const { totalTax } = computeAnnualTax(annualGross, regime, deductions);
  const remaining = Math.max(0, totalTax - tdsPaidSoFar);
  return Math.round(remaining / Math.max(1, monthsRemaining));
}

// ── PF Computation ─────────────────────────────────────────────────────────────
const PF_WAGE_CEILING = 15000; // Statutory ceiling
const EPS_CEILING = 15000;

/**
 * computePF(basicSalary, actualPfWages, options)
 */
function computePF(basicSalary, options = {}) {
  const { pfCeiling = PF_WAGE_CEILING, voluntaryPF = 0 } = options;
  const pfWages = Math.min(basicSalary, pfCeiling);

  const employeeEPF = Math.round(pfWages * 0.12) + Math.round(voluntaryPF);
  const employerEPS = Math.round(Math.min(pfWages, EPS_CEILING) * 0.0833);
  const employerEPF = Math.round(pfWages * 0.12) - employerEPS;
  const edli = Math.round(Math.min(pfWages, 15000) * 0.005);
  const adminCharges = Math.round(pfWages * 0.01);

  return {
    pfWages,
    employeeEPF: employeeEPF,
    employerEPS,
    employerEPF,
    edli,
    adminCharges,
    totalLiability: employeeEPF + employerEPF + employerEPS + edli + adminCharges,
  };
}

// ── ESIC Computation ───────────────────────────────────────────────────────────
const ESIC_WAGE_CEILING = 21000;
const ESIC_EMPLOYEE_RATE = 0.0075; // 0.75%
const ESIC_EMPLOYER_RATE = 0.0325; // 3.25%

function computeESIC(grossSalary) {
  const eligible = grossSalary <= ESIC_WAGE_CEILING;
  if (!eligible) return { eligible: false, employeeESIC: 0, employerESIC: 0, totalESIC: 0 };

  const employeeESIC = Math.round(grossSalary * ESIC_EMPLOYEE_RATE);
  const employerESIC = Math.round(grossSalary * ESIC_EMPLOYER_RATE);
  return { eligible: true, grossWages: grossSalary, employeeESIC, employerESIC, totalESIC: employeeESIC + employerESIC };
}

// ── Professional Tax (Maharashtra slabs) ──────────────────────────────────────
const PT_SLABS = {
  MH: [ // Maharashtra — per month basis
    { upto: 7500,    pt: 0    },
    { upto: 10000,   pt: 175  },
    { upto: Infinity,pt: 200  }, // 300 in Feb
  ],
  KA: [
    { upto: 15000,   pt: 0   },
    { upto: 19999,   pt: 150 },
    { upto: Infinity,pt: 200 },
  ],
  TN: [
    { upto: 3500,    pt: 0  },
    { upto: 4500,    pt: 55 },
    { upto: 6000,    pt: 110 },
    { upto: 7500,    pt: 154 },
    { upto: 10000,   pt: 165 },
    { upto: 12500,   pt: 177 },
    { upto: Infinity,pt: 208 },
  ],
};

function computePT(grossMonthly, state = 'MH', month = null) {
  const slabs = PT_SLABS[state] || PT_SLABS.MH;
  let pt = 0;
  for (const slab of slabs) {
    if (grossMonthly <= slab.upto) { pt = slab.pt; break; }
  }
  // Maharashtra: Feb = 300 if PT is 200
  if (state === 'MH' && pt === 200 && month === 2) pt = 300;
  return { state, grossMonthly, ptDeducted: pt };
}

module.exports = { computeAnnualTax, monthlyTDS, computePF, computeESIC, computePT, PF_WAGE_CEILING, ESIC_WAGE_CEILING };
