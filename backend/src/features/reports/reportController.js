const reportModel = require('./reportModel');

const getTenantId = (req) => req.tenantId || req.user?.tenant_id;

const getFilters = (query = {}) => ({
  employee_id: query.employee_id || query.employeeId || null,
  date_from: query.date_from || query.dateFrom || query.date || null,
  date_to: query.date_to || query.dateTo || query.date || null,
});

const reportController = {
  async createMyReport(req, res) {
    try {
      const text = String(req.body.report_text || req.body.report || '').trim();
      if (!text) {
        return res.status(400).json({ success: false, message: 'Report text is required.' });
      }

      const report = await reportModel.createReport(getTenantId(req), req.user.id, {
        report_text: text,
        report_date: req.body.report_date || req.body.date,
      });

      return res.status(201).json({ success: true, data: report, report });
    } catch (error) {
      console.error('Error creating employee report:', error);
      return res.status(500).json({ success: false, message: 'Failed to submit report.' });
    }
  },

  async getMyReports(req, res) {
    try {
      const reports = await reportModel.getMyReports(getTenantId(req), req.user.id, getFilters(req.query));
      return res.json({ success: true, data: reports, reports });
    } catch (error) {
      console.error('Error fetching employee reports:', error);
      return res.status(500).json({ success: false, message: 'Failed to load reports.' });
    }
  },

  async getReports(req, res) {
    try {
      const reports = await reportModel.getReports(getTenantId(req), getFilters(req.query));
      return res.json({ success: true, data: reports, reports });
    } catch (error) {
      console.error('Error fetching reports:', error);
      return res.status(500).json({ success: false, message: 'Failed to load reports.' });
    }
  },

  async updateRemark(req, res) {
    try {
      const report = await reportModel.updateRemark(
        getTenantId(req),
        req.params.id,
        req.body.admin_remark || req.body.remark || '',
        req.user.id
      );

      if (!report) {
        return res.status(404).json({ success: false, message: 'Report not found.' });
      }

      return res.json({ success: true, data: report, report });
    } catch (error) {
      console.error('Error updating report remark:', error);
      return res.status(500).json({ success: false, message: 'Failed to save remark.' });
    }
  },

  async getEmployees(req, res) {
    try {
      const employees = await reportModel.getEmployees(getTenantId(req));
      return res.json({ success: true, data: employees, employees });
    } catch (error) {
      console.error('Error fetching report employees:', error);
      return res.status(500).json({ success: false, message: 'Failed to load employees.' });
    }
  },
};

module.exports = reportController;
