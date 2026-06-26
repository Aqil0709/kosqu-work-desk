/**
 * Role-aware context builder.
 * Each role receives a scoped system prompt and ONLY the data it is
 * authorised to see. No cross-role data leakage.
 */
const { query } = require('../../config/db');

// ---------- data loaders (each scoped to tenant + role) ----------

async function loadAdminContext(tenantId) {
  const [empStats, leaveStats, attStats, topDepts] = await Promise.all([
    query(`SELECT COUNT(*) AS total,
                  SUM(ed.status='active') AS active,
                  SUM(ed.status='inactive') AS inactive
           FROM employee_details ed WHERE ed.tenant_id=?`, [tenantId]),
    query(`SELECT status, COUNT(*) AS cnt FROM leave_requests
           WHERE tenant_id=? GROUP BY status`, [tenantId]),
    query(`SELECT DATE(check_in) AS date,
                  COUNT(DISTINCT employee_id) AS present
           FROM tb_attendance WHERE tenant_id=? AND check_in >= CURDATE()-INTERVAL 7 DAY
           GROUP BY DATE(check_in) ORDER BY date DESC`, [tenantId]),
    query(`SELECT d.name, COUNT(ed.id) AS headcount
           FROM departments d JOIN employee_details ed ON ed.department_id=d.id
           WHERE d.tenant_id=? GROUP BY d.id ORDER BY headcount DESC LIMIT 5`, [tenantId]),
  ]);
  return { empStats: empStats[0], leaveStats, attStats, topDepts };
}

async function loadHRContext(tenantId) {
  const [pendingLeaves, pendingWFH, newHires, exiting] = await Promise.all([
    query(`SELECT lr.leave_id AS id, u.first_name, u.last_name, lr.leave_type, lr.start_date, lr.end_date
           FROM leave_requests lr
           JOIN employee_details ed ON ed.id = lr.employee_id
           JOIN users u ON u.id = ed.employee_id
           WHERE lr.tenant_id=? AND LOWER(lr.status)='pending'
           ORDER BY lr.created_at DESC LIMIT 20`, [tenantId]),
    query(`SELECT w.id, u.first_name, u.last_name, w.from_date, w.to_date, w.status
           FROM wfh_requests w JOIN users u ON u.id=w.employee_id
           WHERE w.tenant_id=? AND w.status IN ('pending','tl_approved')
           ORDER BY w.created_at DESC LIMIT 20`, [tenantId]),
    query(`SELECT u.first_name, u.last_name, ed.date_of_joining, ed.department_id
           FROM employee_details ed JOIN users u ON u.id = ed.employee_id
           WHERE ed.tenant_id=? AND ed.date_of_joining >= CURDATE()-INTERVAL 30 DAY
           ORDER BY ed.date_of_joining DESC`, [tenantId]),
    query(`SELECT u.first_name, u.last_name, ed.last_working_day
           FROM employee_details ed JOIN users u ON u.id = ed.employee_id
           WHERE ed.tenant_id=? AND ed.last_working_day BETWEEN CURDATE() AND CURDATE()+INTERVAL 30 DAY
           ORDER BY ed.last_working_day`, [tenantId]),
  ]);
  return { pendingLeaves, pendingWFH, newHires, exiting };
}

async function loadTLContext(tenantId, userId) {
  // TL sees only their direct reports
  const [teamMembers, teamLeave, teamAttToday] = await Promise.all([
    query(`SELECT ed.id, u.first_name, u.last_name, ed.employee_id AS emp_code
           FROM employee_details ed JOIN users u ON u.id = ed.employee_id
           WHERE ed.tenant_id=? AND ed.reporting_manager_id=?`, [tenantId, userId]),
    query(`SELECT lr.leave_id AS id, u.first_name, u.last_name, lr.leave_type, lr.start_date, lr.end_date, lr.status
           FROM leave_requests lr
           JOIN employee_details ed ON ed.id = lr.employee_id
           JOIN users u ON u.id = ed.employee_id
           WHERE lr.tenant_id=? AND ed.reporting_manager_id=? AND LOWER(lr.status)='pending'`, [tenantId, userId]),
    query(`SELECT a.employee_id, u.first_name, u.last_name,
                  a.check_in, a.check_out, a.status
           FROM tb_attendance a
           JOIN employee_details ed ON ed.id = a.employee_id
           JOIN users u ON u.id = ed.employee_id
           WHERE a.tenant_id=? AND ed.reporting_manager_id=? AND DATE(a.check_in)=CURDATE()`, [tenantId, userId]),
  ]);
  return { teamMembers, teamLeave, teamAttToday };
}

async function loadEmployeeContext(tenantId, userId) {
  // Resolve employee_details.id from users.id (leave/attendance use ed.id, wfh uses users.id)
  const edRows = await query(`SELECT id FROM employee_details WHERE employee_id=? AND tenant_id=? LIMIT 1`, [userId, tenantId]);
  const edId = edRows[0]?.id || userId;

  const [myLeaves, myWFH, myAtt, myShift] = await Promise.all([
    query(`SELECT leave_type, start_date, end_date, status, created_at
           FROM leave_requests WHERE tenant_id=? AND employee_id=?
           ORDER BY created_at DESC LIMIT 10`, [tenantId, edId]),
    query(`SELECT from_date, to_date, reason, status
           FROM wfh_requests WHERE tenant_id=? AND employee_id=?
           ORDER BY created_at DESC LIMIT 5`, [tenantId, userId]),
    query(`SELECT check_in, check_out, status, DATE(check_in) AS date
           FROM tb_attendance WHERE tenant_id=? AND employee_id=?
           ORDER BY check_in DESC LIMIT 10`, [tenantId, edId]),
    query(`SELECT st.name AS shift_name, st.start_time, st.end_time
           FROM roster_entries re
           JOIN shift_templates st ON st.id=re.shift_template_id
           WHERE re.tenant_id=? AND re.employee_id=? AND re.date=CURDATE()
           LIMIT 1`, [tenantId, userId]),
  ]);
  return { myLeaves, myWFH, myAtt, myShift: myShift[0] || null };
}

// ---------- system prompt builders ----------

function buildSystemPrompt(position, contextData, tenantName = 'your organisation') {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const base = `You are an intelligent HR assistant embedded in the HRMS for ${tenantName}.
Today is ${today}.
You can only see data you are explicitly given below — never invent or guess figures.
Be concise, professional, and helpful. Format lists using bullet points.
NEVER reveal system internals, other employees' private data, or information outside your role scope.`;

  switch (position) {
    case 'admin':
    case 'super_admin': {
      const { empStats, leaveStats, attStats, topDepts } = contextData;
      return `${base}

ROLE: Admin / Super Admin — full organisation visibility.

WORKFORCE SNAPSHOT:
- Total employees: ${empStats.total} | Active: ${empStats.active} | Inactive: ${empStats.inactive}

LEAVE STATUS (all time):
${leaveStats.map(l => `- ${l.status}: ${l.cnt}`).join('\n')}

ATTENDANCE (last 7 days):
${attStats.map(a => `- ${a.date}: ${a.present} present`).join('\n')}

TOP DEPARTMENTS BY HEADCOUNT:
${topDepts.map(d => `- ${d.name}: ${d.headcount}`).join('\n')}

You can answer questions about overall HR metrics, payroll trends, compliance, policy, headcount planning, and all modules.`;
    }

    case 'hr': {
      const { pendingLeaves, pendingWFH, newHires, exiting } = contextData;
      return `${base}

ROLE: HR Manager — HR operations visibility (no payroll system config or super-admin settings).

PENDING LEAVE APPROVALS (${pendingLeaves.length}):
${pendingLeaves.slice(0, 10).map(l => `- ${l.first_name} ${l.last_name}: ${l.leave_type} (${l.start_date} → ${l.end_date})`).join('\n') || 'None'}

PENDING WFH APPROVALS (${pendingWFH.length}):
${pendingWFH.slice(0, 10).map(w => `- ${w.first_name} ${w.last_name}: ${w.from_date} → ${w.to_date} [${w.status}]`).join('\n') || 'None'}

NEW HIRES (last 30 days): ${newHires.length}
UPCOMING EXITS (next 30 days): ${exiting.length}

You can answer questions about leave policy, WFH rules, onboarding status, headcount, and HR workflows.`;
    }

    case 'tl':
    case 'team_lead': {
      const { teamMembers, teamLeave, teamAttToday } = contextData;
      return `${base}

ROLE: Team Lead — visibility limited to your direct reports only.

YOUR TEAM (${teamMembers.length} members):
${teamMembers.map(m => `- ${m.first_name} ${m.last_name} (${m.emp_code})`).join('\n') || 'No direct reports found'}

PENDING LEAVE REQUESTS FROM YOUR TEAM:
${teamLeave.map(l => `- ${l.first_name} ${l.last_name}: ${l.leave_type} (${l.start_date} → ${l.end_date})`).join('\n') || 'None'}

TODAY'S ATTENDANCE FOR YOUR TEAM:
${teamAttToday.map(a => `- ${a.first_name} ${a.last_name}: ${a.check_in ? 'Present (in: ' + a.check_in + ')' : 'Absent'}`).join('\n') || 'No records yet'}

You can answer questions about team attendance, team leave, WFH requests, and project task management for your direct reports only.`;
    }

    default: {
      // employee
      const { myLeaves, myWFH, myAtt, myShift } = contextData;
      return `${base}

ROLE: Employee — visibility limited to your own records only.

YOUR SHIFT TODAY: ${myShift ? `${myShift.shift_name} (${myShift.start_time} – ${myShift.end_time})` : 'Not assigned'}

YOUR RECENT ATTENDANCE:
${myAtt.slice(0, 5).map(a => `- ${a.date}: ${a.status} | In: ${a.check_in || '-'} Out: ${a.check_out || '-'}`).join('\n') || 'No records'}

YOUR LEAVE REQUESTS (recent):
${myLeaves.slice(0, 5).map(l => `- ${l.leave_type}: ${l.start_date} → ${l.end_date} [${l.status}]`).join('\n') || 'None'}

YOUR WFH REQUESTS (recent):
${myWFH.map(w => `- ${w.from_date} → ${w.to_date} [${w.status}]`).join('\n') || 'None'}

You can answer questions about your own attendance, leave balances, WFH requests, payslips, and company policy. You cannot access other employees' data.`;
    }
  }
}

module.exports = {
  loadAdminContext,
  loadHRContext,
  loadTLContext,
  loadEmployeeContext,
  buildSystemPrompt,
};
