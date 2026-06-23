/**
 * Response DTO helpers — enforce least-privilege field selection.
 * Always transform DB rows through these functions before sending to the client.
 * Never return raw DB objects from sensitive tables.
 */

// ── Employee DTOs ─────────────────────────────────────────────────────────────

/** Safe fields for employee list / public-facing lookup (no PII, no payroll) */
const employeeListDto = (e) => ({
  employee_id:      e.employee_id,
  user_id:          e.user_id,
  first_name:       e.first_name,
  last_name:        e.last_name,
  email:            e.email,
  phone:            e.phone,
  gender:           e.gender,
  position:         e.position,
  department_id:    e.department_id,
  department_name:  e.department_name,
  department_ids:   e.department_ids,
  department_names: e.department_names,
  employment_type:  e.employment_type,
  employment_category: e.employment_category,
  status:           e.status,
  is_active:        e.is_active,
  profile_photo:    e.profile_photo,
  joining_date:     e.joining_date,
  work_location:    e.work_location,
  shift_id:         e.shift_id,
  reporting_manager_id: e.reporting_manager_id,
  team_lead_id:     e.team_lead_id,
  client_id:        e.client_id,
  auto_checkout_enabled: e.auto_checkout_enabled,
  created_at:       e.created_at,
});

/** Full profile for HR/Admin — includes payroll + PII (use only in payroll-specific flows) */
const employeeAdminDto = (e) => ({
  ...employeeListDto(e),
  // Extended profile (non-financial)
  date_of_birth:          e.date_of_birth,
  address:                e.address,
  emergency_contact:      e.emergency_contact,
  years_of_experience:    e.years_of_experience,
  previous_company:       e.previous_company,
  previous_designation:   e.previous_designation,
  notice_period:          e.notice_period,
  probation_end_date:     e.probation_end_date,
  last_working_date:      e.last_working_date,
  // Contract / intern fields
  consultant_type:        e.consultant_type,
  contract_duration:      e.contract_duration,
  contract_start_date:    e.contract_start_date,
  contract_end_date:      e.contract_end_date,
  stipend_amount:         e.stipend_amount,
  college_name:           e.college_name,
  internship_duration:    e.internship_duration,
  internship_start_date:  e.internship_start_date,
  internship_end_date:    e.internship_end_date,
  mentor_id:              e.mentor_id,
  // PII — HR/Admin only
  pan_number:             e.pan_number,
  aadhar_number:          e.aadhar_number,
  bank_account_number:    e.bank_account_number,
  ifsc_code:              e.ifsc_code,
  pf_number:              e.pf_number,
  uan_number:             e.uan_number,
  gst_number:             e.gst_number,
  // Payroll — HR/Admin only
  salary:                 e.salary,
  ctc:                    e.ctc,
  salary_basic:           e.salary_basic,
  salary_hra:             e.salary_hra,
  salary_medical_allowance:   e.salary_medical_allowance,
  salary_travel_allowance:    e.salary_travel_allowance,
  salary_other_allowance:     e.salary_other_allowance,
  salary_gross:           e.salary_gross,
  salary_pf:              e.salary_pf,
  salary_esic:            e.salary_esic,
  salary_professional_tax: e.salary_professional_tax,
  salary_lwf:             e.salary_lwf,
  salary_total_deduction: e.salary_total_deduction,
  salary_net:             e.salary_net,
  employer_pf:            e.employer_pf,
  employer_esic:          e.employer_esic,
  pf_applicable:          e.pf_applicable,
  employee_pf_contribution:  e.employee_pf_contribution,
  employer_pf_contribution:  e.employer_pf_contribution,
  epf_fixed_amount:       e.epf_fixed_amount,
  tds_applicable:         e.tds_applicable,
  tds_percentage:         e.tds_percentage,
  tds_amount:             e.tds_amount,
  tds_category:           e.tds_category,
  bonus:                  e.bonus,
  incentives:             e.incentives,
  reimbursements:         e.reimbursements,
  other_deductions:       e.other_deductions,
});

/** Own profile for the employee themselves — safe profile fields only, no raw payroll breakdown */
const employeeSelfDto = (e) => ({
  ...employeeListDto(e),
  gender:                 e.gender,
  date_of_birth:          e.date_of_birth,
  address:                e.address,
  emergency_contact:      e.emergency_contact,
  years_of_experience:    e.years_of_experience,
  previous_company:       e.previous_company,
  previous_designation:   e.previous_designation,
  notice_period:          e.notice_period,
  probation_end_date:     e.probation_end_date,
  last_working_date:      e.last_working_date,
  consultant_type:        e.consultant_type,
  contract_duration:      e.contract_duration,
  contract_start_date:    e.contract_start_date,
  contract_end_date:      e.contract_end_date,
  stipend_amount:         e.stipend_amount,
  college_name:           e.college_name,
  internship_duration:    e.internship_duration,
  internship_start_date:  e.internship_start_date,
  internship_end_date:    e.internship_end_date,
  mentor_id:              e.mentor_id,
  gst_number:             e.gst_number,
  pf_number:              e.pf_number,
  uan_number:             e.uan_number,
  // Employees may see their own PAN/Aadhar for profile completeness
  pan_number:             e.pan_number,
  aadhar_number:          e.aadhar_number,
  // Bank fields for own profile — shown on payslip page
  bank_account_number:    e.bank_account_number,
  ifsc_code:              e.ifsc_code,
});

/** Team-lead view of a direct report — profile only, no payroll/PII */
const employeeTeamLeadDto = (e) => employeeListDto(e);

// ── Salary Record DTOs ────────────────────────────────────────────────────────

/** HR/Admin salary record row — full financial data, no employee banking PII */
const salaryRecordAdminDto = (r) => ({
  id:              r.id,
  employee_id:     r.employee_id,
  employee_detail_id: r.employee_detail_id,
  user_id:         r.user_id,
  first_name:      r.first_name,
  last_name:       r.last_name,
  email:           r.email,
  position:        r.position,
  department:      r.department,
  department_id:   r.department_id,
  employment_category: r.employment_category,
  month:           r.month,
  month_number:    r.month_number,
  year:            r.year,
  basic_salary:    r.basic_salary,
  gross_salary:    r.gross_salary,
  deduction_amount: r.deduction_amount,
  net_salary:      r.net_salary,
  paid_amount:     r.paid_amount,
  balance_amount:  r.balance_amount,
  payment_status:  r.payment_status,
  payment_date:    r.payment_date,
  pf_amount:       r.pf_amount,
  esic_amount:     r.esic_amount,
  professional_tax: r.professional_tax,
  tds_amount:      r.tds_amount,
  annual_salary:   r.annual_salary,
  details:         r.details,
  generated_at:    r.generated_at,
  created_at:      r.created_at,
});

/** Employee self-service salary history row — amounts only, no breakdown details */
const salaryHistorySelfDto = (r) => ({
  id:             r.id,
  month:          r.month,
  month_number:   r.month_number,
  year:           r.year,
  net_salary:     r.net_salary,
  paid_amount:    r.paid_amount,
  balance_amount: r.balance_amount,
  payment_status: r.payment_status,
  payment_date:   r.payment_date,
  period_label:   r.period_label,
});

/** Salary slip for printing — HR/Admin view (includes bank details for payslip generation) */
const salarySlipAdminDto = (r) => ({
  id:               r.id,
  employee_id:      r.employee_id,
  first_name:       r.first_name,
  last_name:        r.last_name,
  email:            r.email,
  phone:            r.phone,
  position:         r.position,
  joining_date:     r.joining_date,
  department_id:    r.department_id,
  department_name:  r.department_name,
  month:            r.month,
  month_number:     r.month_number,
  year:             r.year,
  basic_salary:     r.basic_salary,
  gross_salary:     r.gross_salary,
  net_salary:       r.net_salary,
  paid_amount:      r.paid_amount,
  balance_amount:   r.balance_amount,
  deduction_amount: r.deduction_amount,
  pf_amount:        r.pf_amount,
  esic_amount:      r.esic_amount,
  professional_tax: r.professional_tax,
  tds_amount:       r.tds_amount,
  payment_status:   r.payment_status,
  payment_date:     r.payment_date,
  details:          r.details,
  // Banking details needed for payslip print — HR only
  bank_account_number: r.bank_account_number,
  ifsc_code:           r.ifsc_code,
  pan_number:          r.pan_number,
});

/** Salary slip for employee self-service — no bank details not needed by employee app */
const salarySlipSelfDto = (r) => ({
  id:               r.id,
  employee_id:      r.employee_id,
  first_name:       r.first_name,
  last_name:        r.last_name,
  email:            r.email,
  phone:            r.phone,
  position:         r.position,
  joining_date:     r.joining_date,
  department_id:    r.department_id,
  department_name:  r.department_name,
  month:            r.month,
  month_number:     r.month_number,
  year:             r.year,
  basic_salary:     r.basic_salary,
  gross_salary:     r.gross_salary,
  net_salary:       r.net_salary,
  paid_amount:      r.paid_amount,
  balance_amount:   r.balance_amount,
  deduction_amount: r.deduction_amount,
  pf_amount:        r.pf_amount,
  esic_amount:      r.esic_amount,
  professional_tax: r.professional_tax,
  tds_amount:       r.tds_amount,
  payment_status:   r.payment_status,
  payment_date:     r.payment_date,
  details:          r.details,
  // Component breakdown from employee_details (needed for payslip PDF generation)
  salary_basic:     r.salary_basic,
  salary_hra:       r.salary_hra,
  salary_travel_allowance:   r.salary_travel_allowance,
  salary_medical_allowance:  r.salary_medical_allowance,
  salary_other_allowance:    r.salary_other_allowance,
  salary_pf:        r.salary_pf,
  salary_esic:      r.salary_esic,
  salary_professional_tax:   r.salary_professional_tax,
});

// ── Payment record DTO ────────────────────────────────────────────────────────

const paymentRecordDto = (p) => ({
  id:               p.id,
  salary_record_id: p.salary_record_id,
  amount:           p.amount,
  payment_method:   p.payment_method,
  payment_date:     p.payment_date,
  reference_number: p.reference_number,
  notes:            p.notes,
  created_at:       p.created_at,
});

/** Admin/HR salary slip list row — no banking PII */
const salarySlipListAdminDto = (s) => ({
  id:               s.id,
  salary_record_id: s.salary_record_id,
  month:            s.month,
  month_number:     s.month_number,
  year:             s.year,
  net_salary:       s.net_salary,
  generated_at:     s.generated_at,
  generated_by:     s.generated_by,
  generated_by_name: s.generated_by_name,
  payment_status:   s.payment_status,
  payment_date:     s.payment_date,
  employee_name:    s.employee_name,
  position:         s.position,
  employee_detail_id: s.employee_detail_id,
  // email intentionally excluded from list view — use detail endpoint
});

/** Employee self-service salary history row (admin-viewed history) */
const salaryHistoryAdminDto = (r) => ({
  id:             r.id,
  month:          r.month,
  month_number:   r.month_number,
  year:           r.year,
  basic_salary:   r.basic_salary,
  net_salary:     r.net_salary,
  paid_amount:    r.paid_amount,
  balance_amount: r.balance_amount,
  payment_status: r.payment_status,
  payment_date:   r.payment_date,
});

module.exports = {
  employeeListDto,
  employeeAdminDto,
  employeeSelfDto,
  employeeTeamLeadDto,
  salaryRecordAdminDto,
  salaryHistorySelfDto,
  salaryHistoryAdminDto,
  salarySlipAdminDto,
  salarySlipSelfDto,
  salarySlipListAdminDto,
  paymentRecordDto,
};
