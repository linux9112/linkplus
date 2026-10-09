-- Migration 001: Initial LinkPulse Schema
-- Character set: utf8mb4, Collation: utf8mb4_unicode_ci
-- Engine: InnoDB

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL,
  username VARCHAR(50) NOT NULL,
  normalized_username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  normalized_email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  email_verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX idx_users_normalized_username (normalized_username),
  UNIQUE INDEX idx_users_normalized_email (normalized_email),
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  display_name VARCHAR(100) NOT NULL DEFAULT '',
  bio TEXT NULL,
  avatar_url VARCHAR(1000) NULL,
  theme_settings JSON NOT NULL,
  social_links JSON NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX idx_profiles_user_id (user_id),
  INDEX idx_profiles_is_public (is_public),
  CONSTRAINT fk_profiles_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Links
CREATE TABLE IF NOT EXISTS links (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  destination_url VARCHAR(2048) NOT NULL,
  description TEXT NULL,
  icon VARCHAR(100) NULL,
  thumbnail_url VARCHAR(1000) NULL,
  position INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  is_hidden TINYINT(1) NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  category VARCHAR(100) NULL,
  custom_label VARCHAR(100) NULL,
  media_type VARCHAR(50) NULL,
  media_url VARCHAR(2048) NULL,
  utm_params JSON NULL,
  click_count INT NOT NULL DEFAULT 0,
  scheduled_start DATETIME(3) NULL,
  scheduled_end DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_links_user_position (user_id, position),
  INDEX idx_links_user_visibility (user_id, is_active, is_hidden, is_pinned),
  INDEX idx_links_scheduling (scheduled_start, scheduled_end),
  INDEX idx_links_user_category (user_id, category),
  CONSTRAINT fk_links_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. QR Settings
CREATE TABLE IF NOT EXISTS qr_settings (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  foreground_color VARCHAR(50) NOT NULL DEFAULT '#000000',
  background_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  gradient_settings JSON NULL,
  dot_style VARCHAR(50) NOT NULL DEFAULT 'squares',
  corner_style VARCHAR(50) NOT NULL DEFAULT 'square',
  logo_url VARCHAR(1000) NULL,
  error_correction_level VARCHAR(5) NOT NULL DEFAULT 'H',
  margin INT NOT NULL DEFAULT 2,
  resolution INT NOT NULL DEFAULT 1024,
  transparent_background TINYINT(1) NOT NULL DEFAULT 0,
  preset_name VARCHAR(100) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX idx_qr_settings_user_id (user_id),
  CONSTRAINT fk_qr_settings_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
  id VARCHAR(36) NOT NULL,
  profile_id VARCHAR(36) NOT NULL,
  link_id VARCHAR(36) NULL,
  event_type VARCHAR(50) NOT NULL,
  referrer_category VARCHAR(50) NOT NULL DEFAULT 'direct',
  device_category VARCHAR(50) NOT NULL DEFAULT 'desktop',
  campaign_id VARCHAR(100) NULL,
  visitor_hash VARCHAR(64) NULL,
  country_code VARCHAR(10) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_analytics_profile_created (profile_id, created_at),
  INDEX idx_analytics_link_created (link_id, created_at),
  INDEX idx_analytics_profile_type_created (profile_id, event_type, created_at),
  INDEX idx_analytics_profile_referrer (profile_id, referrer_category),
  INDEX idx_analytics_profile_device (profile_id, device_category),
  INDEX idx_analytics_created (created_at),
  CONSTRAINT fk_analytics_profile_id FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_analytics_link_id FOREIGN KEY (link_id) REFERENCES links (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX idx_prt_token_hash (token_hash),
  INDEX idx_prt_user_expires (user_id, expires_at),
  CONSTRAINT fk_prt_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Email Verification Tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX idx_evt_token_hash (token_hash),
  INDEX idx_evt_user_expires (user_id, expires_at),
  CONSTRAINT fk_evt_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  data JSON NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires_at (expires_at),
  CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Moderation Reports
CREATE TABLE IF NOT EXISTS moderation_reports (
  id VARCHAR(36) NOT NULL,
  reporter_user_id VARCHAR(36) NULL,
  reported_user_id VARCHAR(36) NOT NULL,
  reported_link_id VARCHAR(36) NULL,
  reason VARCHAR(255) NOT NULL,
  details TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  resolved_by VARCHAR(36) NULL,
  resolution_notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_reports_status_created (status, created_at),
  INDEX idx_reports_reported_user (reported_user_id),
  INDEX idx_reports_reported_link (reported_link_id),
  CONSTRAINT fk_reports_reporter_user FOREIGN KEY (reporter_user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_reports_reported_user FOREIGN KEY (reported_user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reports_reported_link FOREIGN KEY (reported_link_id) REFERENCES links (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_reports_resolved_by FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id VARCHAR(36) NOT NULL,
  admin_user_id VARCHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(36) NULL,
  details JSON NULL,
  ip_address_hash VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_audit_admin_created (admin_user_id, created_at),
  INDEX idx_audit_action_created (action, created_at),
  INDEX idx_audit_target (target_type, target_id),
  CONSTRAINT fk_audit_admin_user FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  description VARCHAR(255) NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  updated_by VARCHAR(36) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`key`),
  INDEX idx_settings_is_public (is_public),
  CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
