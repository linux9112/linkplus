-- Migration 002: Badge Management System Schema
-- Adds badge_types and user_badges tables with foreign keys and indexes.

-- 12. Badge Types
CREATE TABLE IF NOT EXISTS badge_types (
  id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  public_label VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(20) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_badge_types_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. User Badges (Assignments & History)
CREATE TABLE IF NOT EXISTS user_badges (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  badge_type_id VARCHAR(50) NOT NULL,
  awarded_by VARCHAR(36) NOT NULL,
  awarded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NULL,
  internal_note TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  revoked_by VARCHAR(36) NULL,
  revoked_at DATETIME(3) NULL,
  revocation_reason TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_user_badges_user_status (user_id, status),
  INDEX idx_user_badges_type (badge_type_id),
  INDEX idx_user_badges_expires (expires_at),
  CONSTRAINT fk_user_badges_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_badges_badge_type_id FOREIGN KEY (badge_type_id) REFERENCES badge_types (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_badges_awarded_by FOREIGN KEY (awarded_by) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_badges_revoked_by FOREIGN KEY (revoked_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed of the 7 Built-in Badges
INSERT INTO badge_types (id, name, public_label, description, icon, color, is_active)
VALUES
  ('verified', 'Verified', 'Verified', 'Identity or account verification completed', 'CheckCircle2', '#2563EB', 1),
  ('trusted', 'Trusted', 'Trusted', 'Account reviewed and considered trustworthy under LinkPlus criteria', 'ShieldCheck', '#059669', 1),
  ('official_creator', 'Official Creator', 'Official Creator', 'Recognized creator on LinkPlus', 'Sparkles', '#7C3AED', 1),
  ('featured', 'Featured', 'Featured', 'Selected for special visibility or recognition', 'Flame', '#D97706', 1),
  ('early_supporter', 'Early Supporter', 'Early Supporter', 'Recognized early LinkPlus user', 'Heart', '#E11D48', 1),
  ('top_creator', 'Top Creator', 'Top Creator', 'Recognized for creator quality or contribution', 'Award', '#CA8A04', 1),
  ('partner', 'Partner', 'Partner', 'Official LinkPlus partner', 'Handshake', '#4F46E5', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  public_label = VALUES(public_label),
  description = VALUES(description),
  icon = VALUES(icon),
  color = VALUES(color);
