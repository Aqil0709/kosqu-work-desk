const MAX_BULK_UPLOAD_ROWS = 5000;
const MAX_BULK_UPLOAD_FILE_SIZE = 5 * 1024 * 1024;

const BULK_UPLOAD_COLUMNS = [
  {
    key: 'employee_id',
    label: 'Emp Id',
    required: false, // Make false here so we can auto-generate if blank, but checked explicitly
    aliases: ['employee id', 'employee_id', 'employee code', 'employee_code', 'emp id', 'emp_id']
  },
  {
    key: 'full_name',
    label: 'Full Name',
    required: true,
    aliases: ['name', 'employee name', 'employee_name', 'name of employee', 'name_of_employees', 'full_name', 'full name']
  },
  {
    key: 'first_name',
    label: 'First Name',
    required: false,
    aliases: ['first name', 'firstname', 'first_name']
  },
  {
    key: 'last_name',
    label: 'Last Name',
    required: false,
    aliases: ['last name', 'lastname', 'last_name']
  },
  {
    key: 'email',
    label: 'Email',
    required: true,
    aliases: ['email', 'email address', 'email_address']
  },
  {
    key: 'phone',
    label: 'Phone',
    required: false,
    aliases: ['phone', 'mobile', 'mobile number', 'phone_number']
  },
  {
    key: 'position',
    label: 'Designation',
    required: true,
    aliases: ['position', 'designation', 'job title', 'job_title']
  },
  {
    key: 'department',
    label: 'Department',
    required: true,
    aliases: ['department', 'department name', 'department_name']
  },
  {
    key: 'department_id',
    label: 'Department ID',
    required: false,
    aliases: ['department id', 'department_id']
  },
  {
    key: 'gender',
    label: 'Gender',
    required: false, // FIXED: Made false so old demo excel files don't fail validation
    aliases: ['sex', 'gender']
  },
  {
    key: 'salary',
    label: 'CTC',
    required: false,
    aliases: ['salary', 'annual salary', 'annual ctc', 'ctc']
  },
  {
    key: 'employment_type',
    label: 'Employment Type',
    required: true,
    aliases: ['employment type', 'employment_type', 'employee type']
  },
  {
    key: 'salary_basic',
    label: 'Basic',
    required: false,
    aliases: ['basic', 'basic salary', 'salary_basic']
  },
  {
    key: 'work_location',
    label: 'Work Location',
    required: false,
    aliases: ['location', 'office location', 'work_location']
  },
  {
    key: 'team_lead_id',
    label: 'Team Lead ID',
    required: false,
    aliases: ['team lead id', 'team_lead', 'team lead', 'team_lead_id']
  },
  {
    key: 'reporting_manager_id',
    label: 'Reporting Manager ID',
    required: false,
    aliases: ['reporting manager id', 'manager id', 'reporting_manager', 'reporting_manager_id']
  },
  {
    key: 'client_id',
    label: 'Client ID',
    required: false,
    aliases: ['client id', 'client', 'client_id']
  },
  {
    key: 'salary_hra',
    label: 'HRA',
    required: false,
    aliases: ['hra', 'salary_hra']
  },
  {
    key: 'salary_medical_allowance',
    label: 'Medical Allowance',
    required: false,
    aliases: ['medical allowance', 'medical_allowance', 'medical', 'salary_medical_allowance']
  },
  {
    key: 'salary_travel_allowance',
    label: 'Travel Allowance',
    required: false,
    aliases: ['travel allowance', 'travel_allowance', 'travel', 'conveyance allowance', 'conveyance', 'salary_travel_allowance']
  },
  {
    key: 'salary_other_allowance',
    label: 'Other',
    required: false,
    aliases: ['other', 'other allowance', 'other_allowance', 'special allowance', 'special', 'salary_other_allowance']
  },
  {
    key: 'joining_date',
    label: 'Joining Date',
    required: true,
    aliases: ['joining date', 'joining_date', 'date of joining', 'date_of_joining']
  },
  {
    key: 'last_working_date',
    label: 'Last Working Date',
    required: false,
    aliases: ['last working date', 'last_working_date', 'last date']
  },
  {
    key: 'date_of_birth',
    label: 'Date of Birth',
    required: false,
    aliases: ['date of birth', 'date_of_birth', 'dob']
  },
  {
    key: 'address',
    label: 'Address',
    required: false,
    aliases: ['address']
  },
  {
    key: 'emergency_contact',
    label: 'Emergency Contact',
    required: false,
    aliases: ['emergency contact', 'emergency_contact']
  },
  {
    key: 'bank_account_number',
    label: 'Bank Account Number',
    required: false,
    aliases: ['bank account number', 'bank_account_number', 'account number', 'account_number']
  },
  {
    key: 'ifsc_code',
    label: 'IFSC Code',
    required: false,
    aliases: ['ifsc code', 'ifsc_code', 'ifsc']
  },
  {
    key: 'pan_number',
    label: 'PAN Number',
    required: false,
    aliases: ['pan number', 'pan_number', 'pan']
  },
  {
    key: 'aadhar_number',
    label: 'Aadhar Number',
    required: false,
    aliases: ['aadhar number', 'aadhar_number', 'aadhaar number', 'aadhaar_number', 'aadhaar', 'aadhar']
  },
  {
    key: 'is_active',
    label: 'Is Active',
    required: false,
    aliases: ['is active', 'is_active', 'active']
  },
  {
    key: 'employment_category',
    label: 'Employment Category',
    required: false,
    aliases: ['employment category', 'employment_category', 'category', 'emp category']
  },
  {
    key: 'notice_period',
    label: 'Notice Period',
    required: false,
    aliases: ['notice period', 'notice_period']
  },
  {
    key: 'pf_applicable',
    label: 'PF Applicable',
    required: false,
    aliases: ['pf applicable', 'pf_applicable']
  },
  {
    key: 'epf_fixed_amount',
    label: 'PF Amount',
    required: false,
    aliases: ['pf amount', 'pf_amount', 'epf fixed amount', 'epf_fixed_amount', 'manual pf', 'manual_pf']
  },
  {
    key: 'pf_number',
    label: 'PF Number',
    required: false,
    aliases: ['pf number', 'pf_number']
  },
  {
    key: 'uan_number',
    label: 'UAN Number',
    required: false,
    aliases: ['uan', 'uan number', 'uan_number']
  },
  {
    key: 'tds_applicable',
    label: 'TDS Applicable',
    required: false,
    aliases: ['tds applicable', 'tds_applicable']
  },
  {
    key: 'tds_percentage',
    label: 'TDS %',
    required: false,
    aliases: ['tds%', 'tds percentage', 'tds_percentage']
  },
  {
    key: 'bonus',
    label: 'Bonus',
    required: false,
    aliases: ['bonus']
  },
  {
    key: 'incentives',
    label: 'Incentives',
    required: false,
    aliases: ['incentives', 'incentive']
  },
  {
    key: 'other_deductions',
    label: 'Other Deductions',
    required: false,
    aliases: ['other deductions', 'other_deductions', 'deductions']
  },
  {
    key: 'shift_id',
    label: 'Shift ID',
    required: false,
    aliases: ['shift', 'shift id', 'shift_id']
  },
  {
    key: 'probation_end_date',
    label: 'Probation End Date',
    required: false,
    aliases: ['probation end date', 'probation_end_date', 'probation']
  }
];

const REQUIRED_BULK_UPLOAD_COLUMNS = BULK_UPLOAD_COLUMNS
  .filter((column) => column.required)
  .map((column) => column.key);

const ALLOWED_BULK_UPLOAD_EXTENSIONS = ['.csv', '.xlsx'];
const ALLOWED_BULK_UPLOAD_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream'
];

module.exports = {
  MAX_BULK_UPLOAD_ROWS,
  MAX_BULK_UPLOAD_FILE_SIZE,
  BULK_UPLOAD_COLUMNS,
  REQUIRED_BULK_UPLOAD_COLUMNS,
  ALLOWED_BULK_UPLOAD_EXTENSIONS,
  ALLOWED_BULK_UPLOAD_MIME_TYPES
};