export const MAX_BULK_UPLOAD_ROWS = 5000;
export const MAX_BULK_UPLOAD_FILE_SIZE = 5 * 1024 * 1024;

export const BULK_UPLOAD_COLUMNS = [
  // ── Identity ──────────────────────────────────────────────────────────────────
  { key: 'employee_id',   label: 'Emp Id',            required: false, aliases: ['employee id', 'employee_id', 'employee code', 'employee_code', 'emp id', 'emp_id'] },
  { key: 'full_name',     label: 'Full Name',          required: true,  aliases: ['name', 'employee name', 'employee_name', 'name of employee', 'name_of_employees', 'full_name'] },
  { key: 'first_name',    label: 'First Name',         required: false, aliases: ['first name', 'firstname', 'first_name'] },
  { key: 'last_name',     label: 'Last Name',          required: false, aliases: ['last name', 'lastname', 'last_name'] },
  { key: 'email',         label: 'Email',              required: true,  aliases: ['email address', 'email_address'] },
  { key: 'phone',         label: 'Phone',              required: false, aliases: ['mobile', 'mobile number', 'phone_number'] },
  { key: 'gender',        label: 'Gender',             required: false, aliases: ['sex'] },
  { key: 'date_of_birth', label: 'Date of Birth',      required: false, aliases: ['dob', 'birth date', 'birthdate', 'date_of_birth'] },
  { key: 'address',       label: 'Address',            required: false, aliases: ['address'] },
  { key: 'emergency_contact', label: 'Emergency Contact', required: false, aliases: ['emergency contact number', 'emergency_contact'] },

  // ── Employment ────────────────────────────────────────────────────────────────
  { key: 'position',             label: 'Designation',          required: true,  aliases: ['designation', 'job title', 'job_title'] },
  { key: 'department',           label: 'Department',           required: true,  aliases: ['department name', 'department_name'] },
  { key: 'department_id',        label: 'Department ID',        required: false, aliases: ['department id', 'department_id'] },
  { key: 'employment_type',      label: 'Employment Type',      required: true,  aliases: ['employment type', 'employment_type', 'employee type'] },
  { key: 'employment_category',  label: 'Employment Category',  required: false, aliases: ['employment category', 'employment_category', 'category', 'emp category'] },
  { key: 'joining_date',         label: 'Joining Date',         required: true,  aliases: ['date of joining', 'date_of_joining', 'joining_date'] },
  { key: 'last_working_date',    label: 'Last Working Date',    required: false, aliases: ['last working date', 'last_working_date', 'last date'] },
  { key: 'notice_period',        label: 'Notice Period',        required: false, aliases: ['notice period', 'notice_period'] },
  { key: 'work_location',        label: 'Work Location',        required: false, aliases: ['location', 'office location', 'work_location'] },
  { key: 'shift_id',             label: 'Shift ID',             required: false, aliases: ['shift', 'shift id', 'shift_id'] },
  { key: 'probation_end_date',   label: 'Probation End Date',   required: false, aliases: ['probation end date', 'probation_end_date', 'probation'] },
  { key: 'is_active',            label: 'Is Active',            required: false, aliases: ['active', 'is_active'] },

  // ── Reporting Structure ───────────────────────────────────────────────────────
  { key: 'team_lead_id',         label: 'Team Lead ID',         required: false, aliases: ['team lead id', 'team_lead', 'team lead', 'team_lead_id'] },
  { key: 'reporting_manager_id', label: 'Reporting Manager ID', required: false, aliases: ['reporting manager id', 'manager id', 'reporting_manager', 'reporting_manager_id'] },
  { key: 'client_id',            label: 'Client ID',            required: false, aliases: ['client id', 'client', 'client_id'] },

  // ── Payroll ───────────────────────────────────────────────────────────────────
  { key: 'salary',                   label: 'CTC',                 required: false, aliases: ['annual salary', 'annual ctc', 'ctc', 'salary'] },
  { key: 'salary_basic',             label: 'Basic',               required: false, aliases: ['basic', 'basic salary', 'salary_basic'] },
  { key: 'salary_hra',               label: 'HRA',                 required: false, aliases: ['hra', 'salary_hra'] },
  { key: 'salary_medical_allowance', label: 'Medical Allowance',   required: false, aliases: ['medical allowance', 'medical_allowance', 'medical', 'salary_medical_allowance'] },
  { key: 'salary_travel_allowance',  label: 'Travel Allowance',    required: false, aliases: ['travel allowance', 'travel_allowance', 'travel', 'conveyance allowance', 'conveyance', 'salary_travel_allowance'] },
  { key: 'salary_other_allowance',   label: 'Other Allowance',     required: false, aliases: ['other', 'other allowance', 'other_allowance', 'special allowance', 'special', 'salary_other_allowance'] },
  { key: 'bonus',                    label: 'Bonus',               required: false, aliases: ['bonus'] },
  { key: 'incentives',               label: 'Incentives',          required: false, aliases: ['incentives', 'incentive'] },
  { key: 'other_deductions',         label: 'Other Deductions',    required: false, aliases: ['other deductions', 'other_deductions', 'deductions'] },

  // ── PF ────────────────────────────────────────────────────────────────────────
  { key: 'pf_applicable',  label: 'PF Applicable',  required: false, aliases: ['pf applicable', 'pf_applicable'] },
  { key: 'pf_number',      label: 'PF Number',      required: false, aliases: ['pf number', 'pf_number'] },
  { key: 'uan_number',     label: 'UAN Number',     required: false, aliases: ['uan', 'uan number', 'uan_number'] },
  { key: 'epf_fixed_amount', label: 'EPF Fixed Amount', required: false, aliases: ['epf fixed amount', 'epf_fixed_amount', 'pf amount', 'pf_amount', 'manual pf', 'manual_pf'] },

  // ── TDS ───────────────────────────────────────────────────────────────────────
  { key: 'tds_applicable', label: 'TDS Applicable', required: false, aliases: ['tds applicable', 'tds_applicable'] },
  { key: 'tds_percentage', label: 'TDS %',          required: false, aliases: ['tds%', 'tds percentage', 'tds_percentage'] },

  // ── Compliance ────────────────────────────────────────────────────────────────
  { key: 'pan_number',    label: 'PAN Number',          required: false, aliases: ['pan'] },
  { key: 'aadhar_number', label: 'Aadhar Number',       required: false, aliases: ['aadhaar number', 'aadhaar', 'aadhar', 'aadhar_number', 'aadhaar_number'] },

  // ── Banking ───────────────────────────────────────────────────────────────────
  { key: 'bank_account_number', label: 'Bank Account Number', required: false, aliases: ['account number', 'account_number', 'bank account', 'bank_account_number'] },
  { key: 'ifsc_code',           label: 'IFSC Code',           required: false, aliases: ['ifsc', 'ifsc_code'] },
];

export const REQUIRED_BULK_UPLOAD_COLUMNS = BULK_UPLOAD_COLUMNS
  .filter((column) => column.required)
  .map((column) => column.key);

export const BULK_UPLOAD_SAMPLE_ROW = {
  employee_id: 'EMP001',
  full_name: 'Asha Patel',
  email: 'asha.patel@example.com',
  phone: '+91 9876543210',
  gender: 'Female',
  date_of_birth: '1995-06-15',
  address: '123 MG Road, Bengaluru, Karnataka',
  emergency_contact: '+91 9123456780',
  position: 'Software Engineer',
  department: 'Engineering',
  employment_type: 'Full-time',
  employment_category: 'employee',
  joining_date: '2026-01-15',
  notice_period: '30',
  work_location: 'Bengaluru',
  is_active: 'active',
  salary: '600000',
  salary_basic: '25000',
  salary_hra: '10000',
  salary_medical_allowance: '1250',
  salary_travel_allowance: '1600',
  salary_other_allowance: '5000',
  bonus: '0',
  incentives: '0',
  other_deductions: '0',
  pf_applicable: 'yes',
  pf_number: '',
  uan_number: '',
  epf_fixed_amount: '',
  tds_applicable: 'no',
  tds_percentage: '',
  pan_number: 'ABCDE1234F',
  aadhar_number: '',
  bank_account_number: '1234567890',
  ifsc_code: 'HDFC0001234',
};
