const { pool } = require('../../config/db');

async function ensureRecruitmentSchema() {
  // Job postings
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS job_postings (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id     INT NOT NULL,
      title         VARCHAR(200) NOT NULL,
      department    VARCHAR(100) DEFAULT NULL,
      location      VARCHAR(150) DEFAULT NULL,
      job_type      ENUM('full_time','part_time','contract','internship','freelance') DEFAULT 'full_time',
      experience_min INT DEFAULT 0,
      experience_max INT DEFAULT NULL,
      salary_min    DECIMAL(12,2) DEFAULT NULL,
      salary_max    DECIMAL(12,2) DEFAULT NULL,
      description   TEXT,
      requirements  TEXT,
      skills        TEXT,
      openings      INT DEFAULT 1,
      status        ENUM('draft','open','paused','closed') DEFAULT 'draft',
      closing_date  DATE DEFAULT NULL,
      created_by    INT NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_status (tenant_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Candidates
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS candidates (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id     INT NOT NULL,
      job_id        INT NOT NULL,
      name          VARCHAR(150) NOT NULL,
      email         VARCHAR(150) NOT NULL,
      phone         VARCHAR(30) DEFAULT NULL,
      current_company VARCHAR(150) DEFAULT NULL,
      current_designation VARCHAR(150) DEFAULT NULL,
      experience_years DECIMAL(4,1) DEFAULT NULL,
      current_salary  DECIMAL(12,2) DEFAULT NULL,
      expected_salary DECIMAL(12,2) DEFAULT NULL,
      notice_period   INT DEFAULT NULL,
      source        ENUM('job_portal','referral','linkedin','direct','agency','campus','other') DEFAULT 'direct',
      resume_path   VARCHAR(500) DEFAULT NULL,
      resume_name   VARCHAR(255) DEFAULT NULL,
      skills        TEXT DEFAULT NULL,
      cover_note    TEXT DEFAULT NULL,
      stage         ENUM('applied','screening','interview','technical','hr_round','offer','selected','rejected','withdrawn') DEFAULT 'applied',
      assigned_to   INT DEFAULT NULL,
      rating        TINYINT DEFAULT NULL,
      notes         TEXT DEFAULT NULL,
      applied_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_job (tenant_id, job_id),
      INDEX idx_tenant_stage (tenant_id, stage)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Interview schedules
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS interviews (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id     INT NOT NULL,
      candidate_id  INT NOT NULL,
      job_id        INT NOT NULL,
      round         TINYINT DEFAULT 1,
      round_name    VARCHAR(100) DEFAULT 'Interview',
      scheduled_at  DATETIME NOT NULL,
      duration_mins INT DEFAULT 60,
      interview_type ENUM('in_person','video','phone') DEFAULT 'video',
      meet_link     VARCHAR(500) DEFAULT NULL,
      interviewers  TEXT DEFAULT NULL,
      status        ENUM('scheduled','completed','cancelled','no_show') DEFAULT 'scheduled',
      feedback      TEXT DEFAULT NULL,
      rating        TINYINT DEFAULT NULL,
      outcome       ENUM('pass','fail','hold','pending') DEFAULT 'pending',
      created_by    INT NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant_candidate (tenant_id, candidate_id),
      INDEX idx_scheduled (tenant_id, scheduled_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Offer letters (recruitment context)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS recruitment_offers (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id     INT NOT NULL,
      candidate_id  INT NOT NULL,
      job_id        INT NOT NULL,
      offered_salary DECIMAL(12,2) DEFAULT NULL,
      joining_date  DATE DEFAULT NULL,
      offer_date    DATE DEFAULT NULL,
      expiry_date   DATE DEFAULT NULL,
      status        ENUM('draft','sent','accepted','declined','expired') DEFAULT 'draft',
      notes         TEXT DEFAULT NULL,
      created_by    INT NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_candidate (tenant_id, candidate_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

module.exports = { ensureRecruitmentSchema };
