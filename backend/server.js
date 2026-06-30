require('dotenv').config();
const http = require('http');
const multer = require('multer');
const express = require('express');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const { setIo } = require('./src/socket/socketInstance');
const { runHrAutomation } = require('./src/services/hrAutomation');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./src/features/users/user.routes');
const superAdminRoutes = require('./src/features/super-admin/superAdminRoutes');
const { router: performanceRoutes, ensurePerformanceSchema } = require('./src/features/performance/performanceRoutes');
const { router: momRoutes, ensureMOMSchema } = require('./src/features/mom/momRoutes');
const errorHandler = require('./src/core/errorHandler');
const sendResponse = require('./src/utils/response');
const logger = require('./src/core/logger');
const { pool } = require('./src/config/db');
const authRoutes = require('./src/features/login/authRoutes');
const employeeRoutes = require('./src/features/employee/employeeRoutes');
const offerLetterRoutes = require('./src/features/employee/offerLetterRoutes');
const brandingRoutes = require('./src/features/branding/brandingRoutes');
const brandingModel = require('./src/features/branding/brandingModel');
const salaryRoutes = require('./src/features/salary/salaryRoutes');
const quotationRoutes = require('./src/features/quotation/quotationRoutes');
const billingRoutes = require('./src/features/billing/billingRoutes');
const deliveryRoutes = require('./src/features/deliverychallan/deliveryRoutes');
const shiftRoutes = require('./src/features/shift/shiftRoutes');
const incrementLetterRoutes = require('./src/features/employee/incrementLetterRoutes');
const experienceLetterRoutes = require('./src/features/employee/experienceLetterRoutes');
// Tax Declaration removed (Phase 6)
const resignationRoutes = require('./src/features/employee/resignationRoutes');
const expenseRoutes = require('./src/features/expense/expenseRoutes');
const attendanceRoutes = require('./src/features/attendance/attendanceRoutes');
const leaveRoutes = require('./src/features/leave/leaveRoutes');
const clientRoutes = require('./src/features/clients/clientRoutes');
const serviceRoutes = require('./src/features/services/serviceRoutes');
const moduleAccessRoutes = require('./src/features/moduleAccess/moduleAccessRoutes');
const pttmRoutes = require('./src/features/pttm/pttmRoutes');
const serviceSettingRoutes = require('./src/features/servicesetting/serviceSettingRoutes');
const dashboardRoutes = require('./src/features/dashboard/dashboardRoutes');
const aiDocumentGeneratorRoutes = require('./src/features/aiDocumentGenerator/aiDocumentGeneratorRoutes');
const reportRoutes = require('./src/features/reports/reportRoutes');
const { ensureServiceSettingSchema } = require('./src/features/servicesetting/serviceSettingSchema');
const { ensureEmployeeSchema } = require('./src/features/employee/employeeSchema');
const { ensureUserManagementSchema } = require('./src/features/userManagement/userManagementSchema');
const { ensureSalarySchema } = require('./src/features/salary/salarySchema');
const { ensureLeaveSchema } = require('./src/features/leave/leaveSchema');
const leadRoutes = require('./src/features/leads/leadRoutes');
const { ensureLeadSchema } = require('./src/features/leads/leadSchema');
const employeeDocumentRoutes = require('./src/features/employeeDocuments/employeeDocumentRoutes');
const { ensureEmployeeDocumentSchema } = require('./src/features/employeeDocuments/employeeDocumentSchema');
const teamLeadRoutes = require('./src/features/teamLead/teamLeadRoutes');
const { ensureTeamLeadSchema } = require('./src/features/teamLead/teamLeadSchema');
const payrollComplianceRoutes = require('./src/features/payrollCompliance/payrollComplianceRoutes');
const { ensurePayrollComplianceSchema } = require('./src/features/payrollCompliance/payrollComplianceSchema');
const recruitmentRoutes = require('./src/features/recruitment/recruitmentRoutes');
const { ensureRecruitmentSchema } = require('./src/features/recruitment/recruitmentSchema');
const onboardingRoutes = require('./src/features/onboarding/onboardingRoutes');
const { ensureOnboardingSchema } = require('./src/features/onboarding/onboardingSchema');
const grievanceRoutes = require('./src/features/grievance/grievanceRoutes');
const { ensureGrievanceSchema } = require('./src/features/grievance/grievanceSchema');
const { ensureAttendanceSchema } = require('./src/features/attendance/attendanceSchema');
const { ensurePasswordResetSchema } = require('./src/features/login/passwordResetSchema');
const { ensureFirstLoginSchema } = require('./src/features/login/firstLoginSchema');
const { ensureIncrementLetterSchema } = require('./src/features/employee/incrementLetterController');
const { startAutoCheckoutScheduler } = require('./src/features/attendance/autoCheckoutService');
const { startDailyNotificationScheduler } = require('./src/services/dailyNotificationScheduler');
const compression = require('compression');
const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && allowedOrigins.length === 0) {
  console.error('FATAL: CORS_ORIGINS must be set in production.');
  process.exit(1);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!isProduction && allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin '${origin}' not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With',
    'Accept', 'Origin', 'x-tenant-id', 'X-Tenant-Id',
  ],
  maxAge: 86400,
};
app.use(compression());
app.use(cors(corsOptions));
app.disable('x-powered-by');
app.set('trust proxy', 1);

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 500 && body && !body.success) {
        body = { ...body, message: 'An internal error occurred. Please try again later.' };
      }
      return originalJson(body);
    };
    next();
  });
}

const io = new Server(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});
setIo(io);

const _jwtForSocket = require('jsonwebtoken');
const _cookieParser = require('cookie');
io.use((socket, next) => {
  // Try auth.token (explicit), then cookie (browser), then query param (legacy)
  let token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    try {
      const cookies = _cookieParser.parse(socket.handshake.headers.cookie || '');
      token = cookies.access_token;
    } catch { /* no cookies */ }
  }
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = _jwtForSocket.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.tenantId = decoded.tenant_id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  socket.join(`tenant:${socket.tenantId}`);
  socket.on('disconnect', () => {});
});

app.use(require('./src/middleware/securityHeaders'));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.get('/health', (req, res) => {
  return sendResponse(res, 200, true, 'Server is healthy', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

app.use('/uploads/branding', express.static(path.join(__dirname, 'src', 'features', 'uploads', 'branding'), {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=86400');
  }
}));

const jwt = require('jsonwebtoken');
const { checkFileOwnership } = require('./src/middleware/fileOwnership');

const verifyUploadsJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.token;
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required to access files' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.tenantId = decoded.tenant_id;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Unified Watermarking Middleware
const { applyWatermark } = require('./src/services/pdfWatermark');

const handleWatermarkingMiddleware = async (req, res, next) => {
  try {
    const filePath = path.join(__dirname, 'src', 'features', 'uploads', req.path);
    
    // Only watermark PDFs; pass through other static files (images, sheets, etc.)
    // Exclude ID cards
    if (!req.path.toLowerCase().endsWith('.pdf') || req.path.toLowerCase().includes('idcard')) {
      return next();
    }
    
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const tenantId = req.user.tenant_id;
    const [brandingRows] = await pool.execute(
      'SELECT company_name, logo_url, watermark_enabled, watermark_opacity, watermark_size FROM tenant_branding WHERE tenant_id = ? LIMIT 1',
      [tenantId]
    );
    
    const branding = brandingRows[0] || {};
    if (!branding.watermark_enabled) {
      return next(); // Served original static file
    }

    const companyName = branding.company_name || 'CONFIDENTIAL';
    const pdfBuffer = require('fs').readFileSync(filePath);
    
    const watermarkedPdf = await applyWatermark(pdfBuffer, companyName, {
      opacity: Number(branding.watermark_opacity || 0.07),
      size: branding.watermark_size || 'medium',
      logo_url: branding.logo_url || null, // Resolves logo image from Branding Module
    });

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="${path.basename(req.path)}"`);
    res.set('Cross-Origin-Resource-Policy', 'same-site');
    res.set('Cache-Control', 'private, no-store');
    return res.send(watermarkedPdf);
  } catch (err) {
    console.error('[Watermark serve error]:', err.message);
    return next(); // Graceful fallback
  }
};

// Apply dynamically watermarked PDF serving to BOTH path registrations
app.use('/uploads-watermarked', verifyUploadsJwt, checkFileOwnership, handleWatermarkingMiddleware, express.static(path.join(__dirname, 'src', 'features', 'uploads'), {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'same-site');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, no-store');
  }
}));

app.use('/uploads', verifyUploadsJwt, checkFileOwnership, handleWatermarkingMiddleware, express.static(path.join(__dirname, 'src', 'features', 'uploads'), {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'same-site');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, no-store');
  }
}));

const { authLimiter, apiLimiter } = require('./src/middleware/rateLimit');

app.use('/api', apiLimiter);
app.use('/api/employees', employeeRoutes);
app.use('/api/team-leads', teamLeadRoutes);
app.use('/api/auth', (req, res, next) => req.method === 'GET' ? next() : authLimiter(req, res, next), authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/offer-letters', offerLetterRoutes);
app.use('/api/branding', brandingRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/projects', require('./src/features/projects/projectRoutes'));
app.use('/api/increment-letters', incrementLetterRoutes);
app.use('/api/experience-letters', experienceLetterRoutes);
app.use('/api/declaration-form', require('./src/features/employee/declarationFormRoutes'));
app.use('/api/resignation-requests', resignationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attendance/face', require('./src/features/attendance/faceEnrollRoutes'));
app.use('/api/leaves', leaveRoutes);
app.use('/api/module-access', moduleAccessRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/pttm', pttmRoutes);
app.use('/api/service-settings', serviceSettingRoutes);
app.use('/api/ai-document-generator', aiDocumentGeneratorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/services', serviceRoutes);

app.use('/api/work-reports', require('./src/features/workReports/workReportRoutes'));
app.use('/api/assets', require('./src/features/assets/assetRoutes'));
app.use('/api/custom-fields', require('./src/features/customFields/customFieldRoutes'));
app.use('/api/events', require('./src/features/events/eventRoutes'));
app.use('/api/announcements', require('./src/features/announcements/announcementRoutes'));
app.use('/api/audit-logs', require('./src/features/auditLog/auditLogRoutes'));
app.use('/api/client-portal', require('./src/features/clientPortal/clientPortalRoutes'));
app.use('/api/notifications', require('./src/features/notifications/notificationRoutes'));
app.use('/api/locations', require('./src/features/locations/locationRoutes'));
app.use('/api/performance', performanceRoutes);
app.use('/api/mom', momRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/employee-documents', employeeDocumentRoutes);
app.use('/api/payroll-compliance', payrollComplianceRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/grievance', grievanceRoutes);
app.use('/api/user-management', require('./src/features/userManagement/userManagementRoutes'));

// Phase 1 — Enterprise Shift Management
app.use('/api/shift-workforce', require('./src/features/shift/shiftTemplateRoutes'));
// Phase 3 — Notes & Reminders
app.use('/api/workspace', require('./src/features/notesReminders/notesRemindersRoutes'));
// Phase 4 — WFH Workflow
app.use('/api/wfh', require('./src/features/wfh/wfhRoutes'));
// Phase 5 — Biometric / Face Recognition
app.use('/api/biometric', require('./src/features/biometric/biometricRoutes'));
// Phase 7 — Role-Aware AI Assistant
app.use('/api/ai-chat', require('./src/features/aiChat/aiChatRoutes'));
// Universal Approval Engine
const approvalRoutes = require('./src/features/approval/approvalRoutes');
app.use('/api/approvals', approvalRoutes);
// Load module integrations (registers engine callbacks for leave/wfh/expense/etc.)
require('./src/features/approval/moduleIntegrations');

app.use((req, res) => {
  return sendResponse(res, 404, false, 'Route not found', null);
});

app.use(errorHandler);

const runSchema = async (label, fn) => {
  try {
    await fn();
  } catch (err) {
    if (err.code === 'ER_LOCK_DEADLOCK') {
      console.warn(`[schema] Deadlock on "${label}", retrying in 500ms…`);
      await new Promise(r => setTimeout(r, 500));
      try { await fn(); } catch (e2) {
        console.warn(`[schema] "${label}" still failed after retry (non-fatal): ${e2.message}`);
      }
    } else if (['ER_DUP_FIELDNAME', 'ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEY'].includes(err.code)) {
      // safe
    } else {
      console.warn(`[schema] "${label}" migration warning (non-fatal): ${err.message}`);
    }
  }
};

const startServer = async () => {
  try {
    const jwtSecret = process.env.JWT_SECRET || '';
    const KNOWN_WEAK = ['arham_simple_secret_2023', 'hello_honey_bunny', 'secret', 'password', 'changeme'];
    if (!jwtSecret) {
      throw new Error('FATAL: JWT_SECRET is not set.');
    }
    if (jwtSecret.length < 32) {
      throw new Error(`FATAL: JWT_SECRET is too short.`);
    }
    if (KNOWN_WEAK.includes(jwtSecret.toLowerCase())) {
      throw new Error('FATAL: JWT_SECRET is a known weak/default value.');
    }

    const connection = await pool.getConnection();
    connection.release();

    await runSchema('moduleAccess', () => moduleAccessRoutes.ensureSchema?.());
    await runSchema('pttm', () => pttmRoutes.ensureSchema?.());
    await runSchema('employee', ensureEmployeeSchema);
    await runSchema('attendance', ensureAttendanceSchema);
    await runSchema('passwordReset', ensurePasswordResetSchema);
    await runSchema('firstLogin', ensureFirstLoginSchema);
    await runSchema('refreshTokens', () => require('./src/features/login/refreshTokenSchema').ensureRefreshTokenSchema());
    await runSchema('salary', ensureSalarySchema);
    await runSchema('serviceSetting', ensureServiceSettingSchema);
    await runSchema('leave', ensureLeaveSchema);
    await runSchema('branding', () => brandingModel.ensureSchema());
    await runSchema('aiDocGen', () => aiDocumentGeneratorRoutes.ensureSchema?.());
    await runSchema('reports', () => reportRoutes.ensureSchema?.());
    await runSchema('announcements', () => require('./src/features/announcements/announcementRoutes').ensureSchema());
    await runSchema('auditLog', () => require('./src/features/auditLog/auditLogRoutes').ensureSchema());
    await runSchema('assets', () => require('./src/features/assets/assetRoutes').ensureSchema());
    await runSchema('performance', () => ensurePerformanceSchema(pool));
    await runSchema('mom', () => ensureMOMSchema(pool));
    await runSchema('userManagement', ensureUserManagementSchema);
    await runSchema('notifications', () => require('./src/features/notifications/notificationRoutes').ensureSchema());
    await runSchema('locations', () => require('./src/features/locations/locationRoutes').ensureSchema());
    await runSchema('workReports', () => require('./src/features/workReports/workReportRoutes').ensureSchema());
    await runSchema('incrementLetters', ensureIncrementLetterSchema);
    await runSchema('leads', ensureLeadSchema);
    await runSchema('employeeDocuments', ensureEmployeeDocumentSchema);
    await runSchema('payrollCompliance', ensurePayrollComplianceSchema);
    await runSchema('recruitment', ensureRecruitmentSchema);
    await runSchema('onboarding', ensureOnboardingSchema);
    await runSchema('grievance', ensureGrievanceSchema);
    await runSchema('wfh', () => require('./src/features/wfh/wfhRoutes').ensureSchema());
    await runSchema('notesReminders', () => require('./src/features/notesReminders/notesRemindersRoutes').ensureSchema());
    await runSchema('aiChat', () => require('./src/features/aiChat/aiChatRoutes').ensureSchema());
    await runSchema('shiftWorkforce', () => require('./src/features/shift/shiftTemplateRoutes').ensureSchema());
    await runSchema('approvalEngine', () => require('./src/features/approval/approvalRoutes').ensureSchema());

    try {
      const { runDbOptimizations } = require('./src/utils/dbOptimizations');
      await runDbOptimizations();
      logger.info('DB optimizations applied');
    } catch (e) {
      console.warn('[db-opt] Non-fatal optimization error:', e.message);
    }

    // Phase 7: auth audit log schema (login events)
    try {
      const { ensureAuthAuditSchema } = require('./src/features/login/authAuditSchema');
      await ensureAuthAuditSchema();
      logger.info('Auth audit log schema ready');
    } catch (e) {
      console.warn('[auth-audit] Non-fatal schema error:', e.message);
    }

    // Team Lead architecture: is_team_lead flag, reports_to_user_id, tl_audit_log
    try {
      await ensureTeamLeadSchema();
      logger.info('Team Lead schema ready');
    } catch (e) {
      console.warn('[team-lead] Non-fatal schema error:', e.message);
    }

    httpServer.listen(PORT, () => {
      logger.info(`Server started on port ${PORT} with Socket.IO`);
      startAutoCheckoutScheduler(logger);
      startDailyNotificationScheduler(logger);

      runHrAutomation(pool).catch(e => console.warn('[HR Automation] Startup run failed:', e.message));
      setInterval(() => {
        runHrAutomation(pool).catch(e => console.warn('[HR Automation] Scheduled run failed:', e.message));
      }, 24 * 60 * 60 * 1000);
    });
  } catch (error) {
    console.error('Database connection error:', error);
    logger.error('Failed to connect to database during startup', { error });
    process.exit(1);
  }
};

startServer();

module.exports = app;