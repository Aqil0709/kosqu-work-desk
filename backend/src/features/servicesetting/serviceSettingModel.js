const crypto = require('crypto');
const { pool } = require('../../config/db');
const { ensureServiceSettingSchema } = require('./serviceSettingSchema');

const SMTP_SETTING_TYPE = 'smtp';

const deriveKey = () => crypto
  .createHash('sha256')
  .update(process.env.SMTP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'work-desk-local-secret')
  .digest();

const encryptSecret = (value) => {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    'v1',
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64')
  ].join(':');
};

const decryptSecret = (value) => {
  if (!value) return '';
  const [version, iv, authTag, encrypted] = String(value).split(':');
  if (version !== 'v1' || !iv || !authTag || !encrypted) {
    return value;
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final()
  ]).toString('utf8');
};

const toPublicSmtpConfig = (row) => {
  if (!row) return null;
  return {
    host: row.smtp_host || '',
    port: row.smtp_port || '',
    username: row.smtp_user || '',
    from_email: row.smtp_from_email || '',
    from_name: row.smtp_from_name || '',
    encryption: row.smtp_encryption || (row.smtp_secure ? 'ssl' : 'tls'),
    has_password: Boolean(row.smtp_password)
  };
};

const toPrivateSmtpConfig = (row) => {
  if (!row) return null;
  return {
    ...toPublicSmtpConfig(row),
    password: decryptSecret(row.smtp_password)
  };
};

const upsertSetting = async (tenantId, settingType, data) => {
  await ensureServiceSettingSchema();
  const columns = Object.keys(data);
  const values = columns.map((column) => data[column]);
  const updates = columns.map((column) => `${column} = VALUES(${column})`).join(', ');

  await pool.execute(
    `INSERT INTO service_settings (tenant_id, setting_type, ${columns.join(', ')})
     VALUES (?, ?, ${columns.map(() => '?').join(', ')})
     ON DUPLICATE KEY UPDATE ${updates}`,
    [tenantId, settingType, ...values]
  );
};

const getSetting = async (tenantId, settingType) => {
  await ensureServiceSettingSchema();
  const [rows] = await pool.execute(
    'SELECT * FROM service_settings WHERE tenant_id = ? AND setting_type = ? LIMIT 1',
    [tenantId, settingType]
  );
  return rows[0] || null;
};

const ServiceSetting = {
  getBankDetails: async (tenantId) => {
    const row = await getSetting(tenantId, 'bank');
    return row ? {
      account_holder: row.account_holder || '',
      account_number: row.account_number || '',
      bank_name: row.bank_name || '',
      ifsc_code: row.ifsc_code || '',
      branch: row.branch || '',
      account_type: row.account_type || ''
    } : null;
  },

  updateBankDetails: async (tenantId, data) => upsertSetting(tenantId, 'bank', {
    account_holder: data.account_holder || null,
    account_number: data.account_number || null,
    bank_name: data.bank_name || null,
    ifsc_code: data.ifsc_code || null,
    branch: data.branch || null,
    account_type: data.account_type || null
  }),

  getGstDetails: async (tenantId) => {
    const row = await getSetting(tenantId, 'gst');
    return row ? {
      gstin: row.gstin || '',
      pan_number: row.pan_number || '',
      hsn_code: row.hsn_code || '',
      tax_rate: row.tax_rate || '',
      is_gst_applicable: Boolean(row.is_gst_applicable),
      sgst_rate: row.sgst_rate || '',
      cgst_rate: row.cgst_rate || '',
      igst_rate: row.igst_rate || ''
    } : null;
  },

  updateGstDetails: async (tenantId, data) => upsertSetting(tenantId, 'gst', {
    gstin: data.gstin || null,
    pan_number: data.pan_number || null,
    hsn_code: data.hsn_code || null,
    tax_rate: data.tax_rate || null,
    is_gst_applicable: data.is_gst_applicable === false ? 0 : 1,
    sgst_rate: data.sgst_rate || null,
    cgst_rate: data.cgst_rate || null,
    igst_rate: data.igst_rate || null
  }),

  getQuotationSettings: async (tenantId) => ({
    bankDetails: await ServiceSetting.getBankDetails(tenantId),
    gstDetails: await ServiceSetting.getGstDetails(tenantId)
  }),

  getSmtpConfig: async (tenantId) => toPublicSmtpConfig(await getSetting(tenantId, SMTP_SETTING_TYPE)),

  getPrivateSmtpConfig: async (tenantId) => toPrivateSmtpConfig(await getSetting(tenantId, SMTP_SETTING_TYPE)),

  updateSmtpConfig: async (tenantId, data) => {
    const existing = await getSetting(tenantId, SMTP_SETTING_TYPE);
    const encryption = data.encryption || 'tls';
    const smtpPort = Number(data.port);

    await upsertSetting(tenantId, SMTP_SETTING_TYPE, {
      smtp_host: data.host || null,
      smtp_port: Number.isFinite(smtpPort) ? smtpPort : null,
      smtp_user: data.username || null,
      smtp_password: data.password ? encryptSecret(data.password) : existing?.smtp_password || null,
      smtp_from_email: data.from_email || null,
      smtp_from_name: data.from_name || null,
      smtp_encryption: encryption,
      smtp_secure: encryption === 'ssl' ? 1 : 0
    });

    return ServiceSetting.getSmtpConfig(tenantId);
  }
};

module.exports = ServiceSetting;
