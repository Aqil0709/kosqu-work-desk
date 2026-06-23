'use strict';

// ── Mocks must be declared before any require() ────────────────────────────

// Mock the DB pool (used by fileOwnership, leaveRoutes, requireModuleAccess)
jest.mock('../src/config/db', () => ({
  pool: { execute: jest.fn() },
  query: jest.fn(),
}));

// Bypass JWT check — req.user is injected by the test-specific middleware
jest.mock('../src/middleware/auth.middleware', () => ({
  verifyToken: (req, _res, next) => next(),
}));

// Bypass module-access DB check — we test identity enforcement, not RBAC
jest.mock('../src/middleware/requireModuleAccess', () => () => (_req, _res, next) => next());

// ── Imports ────────────────────────────────────────────────────────────────
const { pool } = require('../src/config/db');
const { checkFileOwnership } = require('../src/middleware/fileOwnership');

// ── Helpers ────────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockFileReq = (userOverrides = {}, filePath = '/aadhaar/test.pdf') => ({
  user: { id: 10, tenant_id: 1, position: 'employee', ...userOverrides },
  path: filePath,
});

// Make pool.execute return rows in sequence for a single test
const mockPoolSequence = (...rowSets) => {
  let call = 0;
  pool.execute.mockImplementation(() => Promise.resolve([rowSets[call++] ?? []]));
};

// ── FILE OWNERSHIP MIDDLEWARE TESTS ────────────────────────────────────────
describe('File Ownership Middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  test('CLIENT: denied regardless of file ownership', async () => {
    const req = mockFileReq({ position: 'client' });
    const res = mockRes();
    const next = jest.fn();

    await checkFileOwnership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('EMPLOYEE: denied when file belongs to another employee', async () => {
    mockPoolSequence([{ employee_user_id: 99 }]);

    const req = mockFileReq({ id: 10, position: 'employee' });
    const res = mockRes();
    const next = jest.fn();

    await checkFileOwnership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('EMPLOYEE: allowed when file belongs to themselves', async () => {
    mockPoolSequence([{ employee_user_id: 10 }]);

    const req = mockFileReq({ id: 10, position: 'employee' });
    const res = mockRes();
    const next = jest.fn();

    await checkFileOwnership(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('HR: allowed to access any employee file (even another employee)', async () => {
    mockPoolSequence([{ employee_user_id: 99 }]);

    const req = mockFileReq({ id: 1, position: 'hr' });
    const res = mockRes();
    const next = jest.fn();

    await checkFileOwnership(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('ADMIN: allowed to access any file', async () => {
    mockPoolSequence([{ employee_user_id: 55 }]);

    const req = mockFileReq({ id: 1, position: 'admin' });
    const res = mockRes();
    const next = jest.fn();

    await checkFileOwnership(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('EMPLOYEE: allowed to access MOM attachment from their tenant', async () => {
    mockPoolSequence(
      [],           // empDocs — not an employee doc
      [{ id: 7 }]  // momDocs — found
    );

    const req = mockFileReq({ id: 10, position: 'employee' }, '/mom-attachments/meeting.pdf');
    const res = mockRes();
    const next = jest.fn();

    await checkFileOwnership(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('EMPLOYEE: denied when file not found in any ownership table', async () => {
    mockPoolSequence([], []);

    const req = mockFileReq({ id: 10, position: 'employee' }, '/unknown/secret.pdf');
    const res = mockRes();
    const next = jest.fn();

    await checkFileOwnership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('HR: allowed to access unregistered files (AI docs, expenses)', async () => {
    mockPoolSequence([], []);

    const req = mockFileReq({ id: 1, position: 'hr' }, '/ai-documents/1/proposal.docx');
    const res = mockRes();
    const next = jest.fn();

    await checkFileOwnership(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('DB query uses /uploads prefix on the stored file path', async () => {
    mockPoolSequence([{ employee_user_id: 10 }]);

    const req = mockFileReq({ id: 10, position: 'employee' }, '/aadhaar/abc123.pdf');
    await checkFileOwnership(req, mockRes(), jest.fn());

    const [, params] = pool.execute.mock.calls[0];
    expect(params[0]).toBe('/uploads/aadhaar/abc123.pdf');
    expect(params[1]).toBe(1); // tenantId
  });

  test('EMPLOYEE: cross-tenant access blocked because DB query scopes by tenant_id', async () => {
    // tenant 2 user queries a file — the DB returns nothing (tenant mismatch filtered by SQL)
    mockPoolSequence([], []);

    const req = mockFileReq({ id: 10, tenant_id: 2, position: 'employee' }, '/aadhaar/tenant1file.pdf');
    const res = mockRes();
    const next = jest.fn();

    await checkFileOwnership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ── LEAVE APPROVER VALIDATION TESTS ────────────────────────────────────────
describe('Leave Approver Validation', () => {
  const express = require('express');
  const supertest = require('supertest');

  // Build a minimal app with only the leave router
  // The injected middleware sets req.user before the router runs
  const buildApp = (userOverrides = {}) => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: 10, tenant_id: 1, position: 'team_lead', ...userOverrides };
      next();
    });
    const leaveRouter = require('../src/features/leave/leaveRoutes');
    app.use('/api/leaves', leaveRouter);
    return app;
  };

  beforeEach(() => jest.clearAllMocks());

  // ── TL APPROVAL ──────────────────────────────────────────────────────────

  test('TL-approve: 403 when caller is NOT the assigned team lead', async () => {
    // employee's team_lead_id=99, caller=10
    mockPoolSequence([{ leave_id: 1, team_lead_id: 99 }]);

    const app = buildApp({ id: 10, position: 'team_lead' });
    const res = await supertest(app).put('/api/leaves/1/tl-approve').send({ action: 'approve' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Team Lead/i);
  });

  test('TL-approve: 403 when caller has employee role (not a TL at all)', async () => {
    mockPoolSequence([{ leave_id: 1, team_lead_id: 99 }]);

    const app = buildApp({ id: 10, position: 'employee' });
    const res = await supertest(app).put('/api/leaves/1/tl-approve').send({ action: 'approve' });

    expect(res.status).toBe(403);
  });

  test('TL-approve: 200 when caller IS the assigned team lead', async () => {
    mockPoolSequence(
      // identity check: team_lead_id=10, caller=10 ✓
      [{ leave_id: 1, team_lead_id: 10 }],
      // advanceApproval — SELECT * FROM leave_requests
      [{
        leave_id: 1, employee_id: 'EMP100', leave_type: 'Casual',
        is_paid: 1, start_date: '2026-06-01', end_date: '2026-06-02',
        tl_status: 'pending', pl_status: 'pending', hr_status: 'pending',
        status: 'Pending', tenant_id: 1
      }],
      // UPDATE leave_requests
      [{ affectedRows: 1 }]
    );

    const app = buildApp({ id: 10, position: 'team_lead' });
    const res = await supertest(app).put('/api/leaves/1/tl-approve').send({ action: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('TL-approve: HR allowed at TL level ONLY when no TL is assigned', async () => {
    mockPoolSequence(
      // team_lead_id is NULL → no TL assigned
      [{ leave_id: 1, team_lead_id: null }],
      // advanceApproval SELECT
      [{
        leave_id: 1, employee_id: 'EMP100', leave_type: 'Casual',
        is_paid: 1, start_date: '2026-06-01', end_date: '2026-06-02',
        tl_status: 'pending', pl_status: 'pending', hr_status: 'pending',
        status: 'Pending', tenant_id: 1
      }],
      [{ affectedRows: 1 }]
    );

    const app = buildApp({ id: 1, position: 'hr' });
    const res = await supertest(app).put('/api/leaves/1/tl-approve').send({ action: 'approve' });

    expect(res.status).toBe(200);
  });

  test('TL-approve: HR denied at TL level when a TL IS assigned', async () => {
    // team_lead_id=50 is assigned; HR (id=1) must not bypass
    mockPoolSequence([{ leave_id: 1, team_lead_id: 50 }]);

    const app = buildApp({ id: 1, position: 'hr' });
    const res = await supertest(app).put('/api/leaves/1/tl-approve').send({ action: 'approve' });

    expect(res.status).toBe(403);
  });

  // ── PL APPROVAL ──────────────────────────────────────────────────────────

  test('PL-approve: 403 when caller is NOT the assigned project lead', async () => {
    // tl already approved, project_lead_id=99, caller=10
    mockPoolSequence([{ tl_status: 'approved', project_lead_id: 99 }]);

    const app = buildApp({ id: 10, position: 'project_manager' });
    const res = await supertest(app).put('/api/leaves/1/pl-approve').send({ action: 'approve' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Project Lead/i);
  });

  test('PL-approve: 400 when TL has not approved yet (sequential gate)', async () => {
    mockPoolSequence([{ tl_status: 'pending', project_lead_id: 10 }]);

    const app = buildApp({ id: 10, position: 'project_manager' });
    const res = await supertest(app).put('/api/leaves/1/pl-approve').send({ action: 'approve' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Team Lead/i);
  });

  test('PL-approve: 200 when caller IS the assigned project lead', async () => {
    mockPoolSequence(
      // identity check: tl_status=approved, project_lead_id=10 ✓
      [{ tl_status: 'approved', project_lead_id: 10 }],
      [{
        leave_id: 1, employee_id: 'EMP100', leave_type: 'Casual',
        is_paid: 1, start_date: '2026-06-01', end_date: '2026-06-02',
        tl_status: 'approved', pl_status: 'pending', hr_status: 'pending',
        status: 'Pending', tenant_id: 1
      }],
      [{ affectedRows: 1 }]
    );

    const app = buildApp({ id: 10, position: 'project_manager' });
    const res = await supertest(app).put('/api/leaves/1/pl-approve').send({ action: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── HR APPROVAL ───────────────────────────────────────────────────────────

  test('HR-approve: 403 when caller has employee position', async () => {
    const app = buildApp({ id: 10, position: 'employee' });
    const res = await supertest(app).put('/api/leaves/1/hr-approve').send({ action: 'approve' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/HR or Admin/i);
  });

  test('HR-approve: 403 when caller has team_lead position', async () => {
    const app = buildApp({ id: 10, position: 'team_lead' });
    const res = await supertest(app).put('/api/leaves/1/hr-approve').send({ action: 'approve' });

    expect(res.status).toBe(403);
  });

  test('HR-approve: 403 when caller has project_manager position', async () => {
    const app = buildApp({ id: 10, position: 'project_manager' });
    const res = await supertest(app).put('/api/leaves/1/hr-approve').send({ action: 'approve' });

    expect(res.status).toBe(403);
  });

  test('HR-approve: 400 when PL has not approved yet (sequential gate)', async () => {
    mockPoolSequence([{ pl_status: 'pending' }]);

    const app = buildApp({ id: 1, position: 'hr' });
    const res = await supertest(app).put('/api/leaves/1/hr-approve').send({ action: 'approve' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Project Lead/i);
  });

  test('HR-approve: 200 when caller is HR and PL already approved', async () => {
    mockPoolSequence(
      [{ pl_status: 'approved' }],
      [{
        leave_id: 1, employee_id: 'EMP100', leave_type: 'Casual',
        is_paid: 1, start_date: '2026-06-01', end_date: '2026-06-02',
        tl_status: 'approved', pl_status: 'approved', hr_status: 'pending',
        status: 'Pending', tenant_id: 1
      }],
      [{ affectedRows: 1 }],
      [{ employee_id: 'EMP100', leave_type: 'Casual', is_paid: 1, start_date: '2026-06-01', end_date: '2026-06-02' }],
      [{ is_paid: 1 }],
      [{ affectedRows: 1 }],
      [{ affectedRows: 1 }],
      [{ affectedRows: 1 }]
    );

    const app = buildApp({ id: 1, position: 'hr' });
    const res = await supertest(app).put('/api/leaves/1/hr-approve').send({ action: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('ADMIN: allowed to perform HR-level final approval', async () => {
    mockPoolSequence(
      [{ pl_status: 'approved' }],
      [{
        leave_id: 1, employee_id: 'EMP100', leave_type: 'Casual',
        is_paid: 0, start_date: '2026-06-01', end_date: '2026-06-01',
        tl_status: 'approved', pl_status: 'approved', hr_status: 'pending',
        status: 'Pending', tenant_id: 1
      }],
      [{ affectedRows: 1 }],
      [{ employee_id: 'EMP100', leave_type: 'Casual', is_paid: 0, start_date: '2026-06-01', end_date: '2026-06-01' }],
      [{ is_paid: 0 }],
      [{ affectedRows: 1 }]
    );

    const app = buildApp({ id: 1, position: 'admin' });
    const res = await supertest(app).put('/api/leaves/1/hr-approve').send({ action: 'approve' });

    expect(res.status).toBe(200);
  });
});
