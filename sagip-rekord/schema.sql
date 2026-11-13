CREATE DATABASE IF NOT EXISTS sagiprekord
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sagiprekord;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  role VARCHAR(20) NOT NULL,
  barangay VARCHAR(120) NOT NULL DEFAULT 'Palatiw',
  active TINYINT(1) NOT NULL DEFAULT 1,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_active (role, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS records (
  id VARCHAR(64) NOT NULL,
  owner_id VARCHAR(64) NULL,
  owner_email VARCHAR(254) NOT NULL DEFAULT '',
  created_by VARCHAR(64) NULL,
  verified_by VARCHAR(64) NULL,
  doc_type VARCHAR(200) NOT NULL,
  resident_name VARCHAR(200) NOT NULL,
  reference_no VARCHAR(100) NOT NULL,
  amount_or_date VARCHAR(200) NOT NULL,
  purok_address VARCHAR(300) NOT NULL,
  priority_level VARCHAR(80) NOT NULL,
  original_ocr LONGTEXT NOT NULL,
  verified_ocr LONGTEXT NOT NULL,
  verified_advice LONGTEXT NOT NULL,
  correction_note VARCHAR(500) NOT NULL,
  edit_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_records_owner_updated (owner_id, updated_at),
  KEY idx_records_reference (reference_no),
  CONSTRAINT fk_records_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_records_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_records_verifier FOREIGN KEY (verified_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS record_checklist (
  record_id VARCHAR(64) NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  item_text VARCHAR(1000) NOT NULL,
  is_done TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (record_id, position),
  CONSTRAINT fk_checklist_record FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(120) NOT NULL,
  actor_role VARCHAR(20) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  details_json LONGTEXT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_audit_event_time (event_time),
  KEY idx_audit_actor_time (actor_id, event_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_migrations (
  migration_name VARCHAR(120) NOT NULL,
  completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (migration_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
