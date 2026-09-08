SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS access_permissions (
  permission_key VARCHAR(100) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  application ENUM('admin', 'staff') NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CHECK (sort_order >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS resorts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(80) NOT NULL UNIQUE,
  location TEXT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Indian/Maldives',
  contact_name VARCHAR(255) NULL,
  contact_phone VARCHAR(100) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  slug VARCHAR(160) NULL UNIQUE,
  contact_email VARCHAR(255) NULL,
  whatsapp_number VARCHAR(100) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  observation_spots TEXT NOT NULL,
  INDEX idx_resorts_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS access_roles (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(500) NOT NULL DEFAULT '',
  base_role ENUM('admin', 'internal', 'external') NOT NULL,
  access_level ENUM('full', 'scoped', 'read_only') NOT NULL DEFAULT 'scoped',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  created_by CHAR(36) NULL,
  updated_by CHAR(36) NULL,
  permissions_updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_access_roles_id_base_role (id, base_role),
  INDEX idx_access_roles_base_status (base_role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL UNIQUE,
  phone VARCHAR(100) NULL,
  role ENUM('admin', 'internal', 'external') NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  password_hash TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  resort_id CHAR(36) NULL,
  last_seen_at DATETIME(3) NULL,
  last_active_at DATETIME(3) NULL,
  access_role_id CHAR(36) NOT NULL,
  CONSTRAINT fk_users_resort FOREIGN KEY (resort_id) REFERENCES resorts(id),
  CONSTRAINT fk_users_access_role FOREIGN KEY (access_role_id) REFERENCES access_roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_users_access_role_base
    FOREIGN KEY (access_role_id, role) REFERENCES access_roles(id, base_role) ON DELETE RESTRICT,
  INDEX idx_users_role (role),
  INDEX idx_users_resort_id (resort_id),
  INDEX idx_users_access_role_id (access_role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @access_roles_created_fk_exists = (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE() AND table_name = 'access_roles' AND constraint_name = 'fk_access_roles_created_by'
);
SET @access_roles_created_fk_sql = IF(
  @access_roles_created_fk_exists = 0,
  'ALTER TABLE access_roles ADD CONSTRAINT fk_access_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE access_roles_created_fk_stmt FROM @access_roles_created_fk_sql;
EXECUTE access_roles_created_fk_stmt;
DEALLOCATE PREPARE access_roles_created_fk_stmt;

SET @access_roles_updated_fk_exists = (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE() AND table_name = 'access_roles' AND constraint_name = 'fk_access_roles_updated_by'
);
SET @access_roles_updated_fk_sql = IF(
  @access_roles_updated_fk_exists = 0,
  'ALTER TABLE access_roles ADD CONSTRAINT fk_access_roles_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE access_roles_updated_fk_stmt FROM @access_roles_updated_fk_sql;
EXECUTE access_roles_updated_fk_stmt;
DEALLOCATE PREPARE access_roles_updated_fk_stmt;

CREATE TABLE IF NOT EXISTS access_role_permissions (
  access_role_id CHAR(36) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  granted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  granted_by CHAR(36) NULL,
  PRIMARY KEY (access_role_id, permission_key),
  CONSTRAINT fk_access_role_permissions_role FOREIGN KEY (access_role_id) REFERENCES access_roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_access_role_permissions_permission FOREIGN KEY (permission_key) REFERENCES access_permissions(permission_key) ON DELETE RESTRICT,
  CONSTRAINT fk_access_role_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_access_role_permissions_permission (permission_key, access_role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS packages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  package_type ENUM('regular', 'private', 'kids') NOT NULL,
  experience_type ENUM('communal', 'private', 'kids') NOT NULL,
  location TEXT NOT NULL,
  adult_price_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  child_price_usd DECIMAL(14,2) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  description TEXT NULL,
  child_age_range VARCHAR(120) NULL,
  image_data LONGBLOB NULL,
  image_mime_type VARCHAR(120) NULL,
  image_file_name VARCHAR(255) NULL,
  is_chargeable BOOLEAN NOT NULL DEFAULT TRUE,
  resort_id CHAR(36) NULL,
  schedule VARCHAR(120) NOT NULL DEFAULT 'Upon request',
  CONSTRAINT fk_packages_resort FOREIGN KEY (resort_id) REFERENCES resorts(id),
  CHECK (adult_price_usd >= 0),
  CHECK (child_price_usd IS NULL OR child_price_usd >= 0),
  UNIQUE KEY uq_packages_resort_name (resort_id, name),
  INDEX idx_packages_active (is_active),
  INDEX idx_packages_resort_active (resort_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS package_inclusions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  package_id CHAR(36) NOT NULL,
  label VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_package_inclusions_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  UNIQUE KEY uq_package_inclusions_sort (package_id, sort_order),
  INDEX idx_package_inclusions_active (package_id, is_active, sort_order),
  CHECK (sort_order >= 0),
  CHECK (CHAR_LENGTH(TRIM(label)) BETWEEN 1 AND 120)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sky_events (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(120) NOT NULL,
  event_type ENUM('astronomy', 'meteor', 'resort') NOT NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NULL,
  description TEXT NOT NULL,
  source_name VARCHAR(255) NULL,
  source_url TEXT NULL,
  visibility ENUM('north', 'south', 'both') NOT NULL DEFAULT 'both',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by CHAR(36) NULL,
  updated_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  resort_id CHAR(36) NOT NULL,
  package_id CHAR(36) NULL,
  observation_spot VARCHAR(255) NULL,
  capacity INT NULL,
  price_override_usd DECIMAL(14,2) NULL,
  image_url VARCHAR(2048) NULL,
  status ENUM('draft', 'published', 'cancelled', 'sold_out') NOT NULL DEFAULT 'published',
  CONSTRAINT fk_sky_events_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_sky_events_updater FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT fk_sky_events_resort FOREIGN KEY (resort_id) REFERENCES resorts(id),
  CONSTRAINT fk_sky_events_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL,
  CHECK (ends_at IS NULL OR ends_at > starts_at),
  CHECK (capacity IS NULL OR capacity > 0),
  CHECK (price_override_usd IS NULL OR price_override_usd >= 0),
  INDEX idx_sky_events_public_starts (is_published, starts_at),
  INDEX idx_sky_events_resort_status_starts (resort_id, status, starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_code VARCHAR(100) NOT NULL UNIQUE,
  booking_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  event_date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  room_number VARCHAR(100) NOT NULL,
  nationality VARCHAR(120) NOT NULL,
  adult_count INT NOT NULL DEFAULT 0,
  child_count INT NOT NULL DEFAULT 0,
  child_ages TEXT NULL,
  package_id CHAR(36) NOT NULL,
  staff_id CHAR(36) NOT NULL,
  status ENUM('pending', 'active', 'completed', 'cancelled_by_guest', 'cancelled_weather', 'rescheduled', 'rejected') NOT NULL DEFAULT 'pending',
  signed_by_guest BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  base_total_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  service_charge_10_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  gst_17_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  invoice_total_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  operation_share_50_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  company_share_50_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  staff_commission_5_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  field_tip_incentive_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  payout_status ENUM('commission_pending', 'commission_approved', 'commission_paid') NOT NULL DEFAULT 'commission_pending',
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  created_by CHAR(36) NULL,
  updated_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  guest_phone VARCHAR(100) NULL,
  guest_email VARCHAR(320) NULL,
  preferred_language VARCHAR(100) NULL,
  special_occasion VARCHAR(255) NULL,
  booking_source VARCHAR(120) NULL,
  add_ons JSON NOT NULL,
  package_notes TEXT NULL,
  payment_method VARCHAR(120) NULL,
  payment_status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
  payment_confirmed_at DATETIME(3) NULL,
  payment_confirmed_by CHAR(36) NULL,
  payment_reference VARCHAR(120) NULL,
  payment_notes TEXT NULL,
  invoice_number VARCHAR(120) NULL,
  billing_notes TEXT NULL,
  weather_condition VARCHAR(255) NULL,
  equipment_needed TEXT NULL,
  assigned_astronomer VARCHAR(255) NULL,
  assigned_butler VARCHAR(255) NULL,
  setup_status VARCHAR(60) NOT NULL DEFAULT 'not_started',
  tip_recipient VARCHAR(255) NULL,
  tip_notes TEXT NULL,
  guardian_name VARCHAR(255) NULL,
  guardian_phone VARCHAR(100) NULL,
  privacy_preference TEXT NULL,
  dietary_restrictions TEXT NULL,
  reschedule_consent TEXT NULL,
  slot_status VARCHAR(60) NOT NULL DEFAULT 'available',
  resort_id CHAR(36) NULL,
  booked_adult_price_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  booked_child_price_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  assigned_internal_id CHAR(36) NULL,
  sky_event_id CHAR(36) NULL,
  observation_spot VARCHAR(255) NULL,
  CONSTRAINT fk_bookings_package FOREIGN KEY (package_id) REFERENCES packages(id),
  CONSTRAINT fk_bookings_staff FOREIGN KEY (staff_id) REFERENCES users(id),
  CONSTRAINT fk_bookings_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_bookings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT fk_bookings_payment_confirmer FOREIGN KEY (payment_confirmed_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_resort FOREIGN KEY (resort_id) REFERENCES resorts(id),
  CONSTRAINT fk_bookings_assigned_internal FOREIGN KEY (assigned_internal_id) REFERENCES users(id),
  CONSTRAINT fk_bookings_sky_event FOREIGN KEY (sky_event_id) REFERENCES sky_events(id) ON DELETE SET NULL,
  CHECK (adult_count >= 0),
  CHECK (child_count >= 0),
  CHECK (adult_count + child_count > 0),
  CHECK (field_tip_incentive_usd >= 0),
  CHECK (currency = 'USD'),
  CHECK (
    (payment_status = 'pending' AND payment_confirmed_at IS NULL AND payment_confirmed_by IS NULL)
    OR
    (payment_status = 'paid' AND payment_confirmed_at IS NOT NULL AND payment_confirmed_by IS NOT NULL)
  ),
  INDEX idx_bookings_event_date (event_date),
  INDEX idx_bookings_status (status),
  INDEX idx_bookings_staff_id (staff_id),
  INDEX idx_bookings_resort_id (resort_id),
  INDEX idx_bookings_assigned_internal (assigned_internal_id, event_date),
  INDEX idx_bookings_sky_event (sky_event_id),
  INDEX idx_bookings_booking_source (booking_source),
  INDEX idx_bookings_guest_phone (guest_phone),
  INDEX idx_bookings_payment_status (payment_status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS booking_participants (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36) NOT NULL,
  participant_type ENUM('adult', 'child') NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  age INT NULL,
  nationality VARCHAR(80) NOT NULL,
  notes VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_booking_participants_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  UNIQUE KEY uq_booking_participants_order (booking_id, sort_order),
  INDEX idx_booking_participants_booking (booking_id, sort_order),
  CHECK (age IS NULL OR age BETWEEN 0 AND 120),
  CHECK (sort_order >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS booking_experiences (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36) NOT NULL,
  package_id CHAR(36) NOT NULL,
  sky_event_id CHAR(36) NULL,
  event_date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  observation_spot VARCHAR(120) NULL,
  booked_adult_price_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  booked_child_price_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  base_total_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_booking_experiences_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_experiences_package
    FOREIGN KEY (package_id) REFERENCES packages(id),
  CONSTRAINT fk_booking_experiences_sky_event
    FOREIGN KEY (sky_event_id) REFERENCES sky_events(id) ON DELETE SET NULL,
  UNIQUE KEY uq_booking_experiences_order (booking_id, sort_order),
  INDEX idx_booking_experiences_booking (booking_id, sort_order),
  INDEX idx_booking_experiences_package (package_id),
  CHECK (booked_adult_price_usd >= 0),
  CHECK (booked_child_price_usd >= 0),
  CHECK (base_total_usd >= 0),
  CHECK (sort_order >= 0),
  CHECK (time_end > time_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS booking_reschedule_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id CHAR(36) NOT NULL,
  previous_event_date DATE NOT NULL,
  previous_time_start TIME NOT NULL,
  previous_time_end TIME NOT NULL,
  new_event_date DATE NOT NULL,
  new_time_start TIME NOT NULL,
  new_time_end TIME NOT NULL,
  reason TEXT NULL,
  changed_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_reschedule_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_reschedule_changed_by FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_reschedule_booking_created (booking_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS feedback_tokens (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36) NOT NULL UNIQUE,
  token VARCHAR(255) NOT NULL UNIQUE,
  status ENUM('not_sent', 'sent', 'submitted', 'expired') NOT NULL DEFAULT 'not_sent',
  sent_at DATETIME(3) NULL,
  submitted_at DATETIME(3) NULL,
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_feedback_tokens_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36) NOT NULL UNIQUE,
  token_id CHAR(36) NOT NULL UNIQUE,
  rating INT NOT NULL,
  comment TEXT NULL,
  submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_feedback_submission_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_submission_token FOREIGN KEY (token_id) REFERENCES feedback_tokens(id) ON DELETE CASCADE,
  CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS payout_requests (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  requester_id CHAR(36) NOT NULL,
  resort_id CHAR(36) NULL,
  amount_usd DECIMAL(14,2) NOT NULL,
  commission_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  star_bonus_usd DECIMAL(14,2) NOT NULL DEFAULT 0,
  star_points DECIMAL(14,2) NOT NULL DEFAULT 0,
  full_stars INT NOT NULL DEFAULT 0,
  account_number VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  admin_notes TEXT NULL,
  status ENUM('requested', 'processed', 'completed', 'rejected') NOT NULL DEFAULT 'requested',
  reviewed_by CHAR(36) NULL,
  reviewed_at DATETIME(3) NULL,
  paid_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  bank_name VARCHAR(255) NOT NULL,
  account_holder_name VARCHAR(255) NOT NULL,
  CONSTRAINT fk_payout_requester FOREIGN KEY (requester_id) REFERENCES users(id),
  CONSTRAINT fk_payout_resort FOREIGN KEY (resort_id) REFERENCES resorts(id),
  CONSTRAINT fk_payout_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  CHECK (amount_usd > 0),
  CHECK (commission_usd >= 0),
  CHECK (star_bonus_usd >= 0),
  CHECK (star_points >= 0),
  CHECK (full_stars BETWEEN 0 AND 5),
  INDEX idx_payout_requester_created (requester_id, created_at),
  INDEX idx_payout_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  invoice_number VARCHAR(48) NOT NULL UNIQUE,
  invoice_type ENUM('customer', 'staff_payout') NOT NULL,
  status ENUM('issued', 'paid') NOT NULL,
  booking_id CHAR(36) NULL UNIQUE,
  payout_request_id CHAR(36) NULL UNIQUE,
  recipient_name VARCHAR(200) NOT NULL,
  recipient_email VARCHAR(320) NULL,
  recipient_phone VARCHAR(80) NULL,
  recipient_detail TEXT NULL,
  payment_method TEXT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  issued_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  due_date DATE NULL,
  subtotal_usd DECIMAL(12,2) NOT NULL,
  service_charge_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_usd DECIMAL(12,2) NOT NULL,
  line_items JSON NOT NULL,
  source_snapshot JSON NOT NULL,
  notes TEXT NULL,
  issued_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_invoices_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_payout FOREIGN KEY (payout_request_id) REFERENCES payout_requests(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_issuer FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (
    (invoice_type = 'customer' AND status = 'issued' AND booking_id IS NOT NULL AND payout_request_id IS NULL)
    OR
    (invoice_type = 'staff_payout' AND status = 'paid' AND booking_id IS NULL AND payout_request_id IS NOT NULL)
  ),
  CHECK (currency = 'USD'),
  CHECK (due_date IS NULL OR due_date >= DATE(issued_at)),
  CHECK (subtotal_usd >= 0),
  CHECK (service_charge_usd >= 0),
  CHECK (tax_usd >= 0),
  CHECK (total_usd > 0),
  CHECK (total_usd = subtotal_usd + service_charge_usd + tax_usd),
  CHECK (JSON_TYPE(line_items) = 'ARRAY'),
  CHECK (JSON_TYPE(source_snapshot) = 'OBJECT'),
  INDEX idx_invoices_type_issued (invoice_type, issued_at),
  INDEX idx_invoices_recipient (recipient_name),
  INDEX idx_invoices_issued_by (issued_by, issued_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  recipient_user_id CHAR(36) NOT NULL,
  type ENUM('booking', 'payout') NOT NULL,
  source_table ENUM('bookings', 'payout_requests') NOT NULL,
  source_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  meta TEXT NULL,
  link TEXT NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_notifications_source (recipient_user_id, type, source_id),
  INDEX idx_notifications_recipient_created (recipient_user_id, created_at),
  INDEX idx_notifications_recipient_read (recipient_user_id, read_at),
  INDEX idx_notifications_source (type, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id CHAR(36) NULL,
  action TEXT NOT NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id CHAR(36) NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_actor_created (actor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS rate_limit_login (
  email VARCHAR(320) NOT NULL,
  attempted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_rate_limit_email_time (email, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS rate_limit_registration (
  scope VARCHAR(32) NOT NULL,
  key_hash CHAR(64) NOT NULL,
  window_started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  attempts INT NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, key_hash),
  INDEX idx_rate_limit_registration_window (window_started_at),
  CHECK (attempts >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sky_app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  updated_by CHAR(36) NULL,
  CONSTRAINT fk_sky_app_settings_user FOREIGN KEY (updated_by) REFERENCES users(id),
  CHECK (id = TRUE),
  CHECK (latitude BETWEEN -90 AND 90),
  CHECK (longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sky_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  star_adult_unit DECIMAL(10,2) NOT NULL DEFAULT 1,
  star_child_unit DECIMAL(10,2) NOT NULL DEFAULT 0.5,
  star_threshold DECIMAL(10,2) NOT NULL DEFAULT 10,
  star_bonus_usd DECIMAL(14,2) NOT NULL DEFAULT 10,
  updated_by CHAR(36) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sky_settings_user FOREIGN KEY (updated_by) REFERENCES users(id),
  CHECK (id = TRUE),
  CHECK (star_adult_unit >= 0),
  CHECK (star_child_unit >= 0),
  CHECK (star_threshold > 0),
  CHECK (star_bonus_usd >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS domain_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  actor_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  processed_at DATETIME(3) NULL,
  CONSTRAINT fk_domain_events_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_domain_events_type (event_type),
  INDEX idx_domain_events_created (created_at),
  INDEX idx_domain_events_unprocessed (processed_at),
  INDEX idx_domain_events_actor (actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE OR REPLACE VIEW booking_finance_report AS
SELECT b.id, b.booking_code, b.event_date, b.guest_name, b.room_number,
  p.name AS package_name, p.package_type, r.id AS resort_id, r.name AS resort_name,
  r.code AS resort_code, u.id AS staff_id, u.name AS staff_name, u.role AS staff_role,
  b.status, b.signed_by_guest, b.base_total_usd, b.service_charge_10_usd,
  b.gst_17_usd, b.invoice_total_usd, b.operation_share_50_usd,
  b.company_share_50_usd, b.staff_commission_5_usd, b.field_tip_incentive_usd,
  b.payout_status, fs.rating, fs.comment
FROM bookings b
JOIN packages p ON p.id = b.package_id
JOIN users u ON u.id = b.staff_id
LEFT JOIN resorts r ON r.id = b.resort_id
LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id;

CREATE OR REPLACE VIEW resort_staff_coverage AS
SELECT r.id AS resort_id, r.name AS resort_name, r.status AS resort_status,
  COALESCE(SUM(CASE WHEN u.role = 'internal' AND u.status = 'active' THEN 1 ELSE 0 END), 0) AS active_internal_count,
  COALESCE(SUM(CASE WHEN u.role = 'external' AND u.status = 'active' THEN 1 ELSE 0 END), 0) AS active_external_count,
  (SELECT COUNT(*) FROM bookings b WHERE b.resort_id = r.id AND b.status IN ('pending', 'active', 'rescheduled')) AS open_bookings_count,
  CASE
    WHEN r.status <> 'active' THEN 'inactive'
    WHEN SUM(CASE WHEN u.role = 'internal' AND u.status = 'active' THEN 1 ELSE 0 END) > 0
      AND SUM(CASE WHEN u.role = 'external' AND u.status = 'active' THEN 1 ELSE 0 END) > 0 THEN 'ready'
    WHEN SUM(CASE WHEN u.role = 'internal' AND u.status = 'active' THEN 1 ELSE 0 END) = 0
      AND SUM(CASE WHEN u.role = 'external' AND u.status = 'active' THEN 1 ELSE 0 END) = 0 THEN 'needs_both'
    WHEN SUM(CASE WHEN u.role = 'internal' AND u.status = 'active' THEN 1 ELSE 0 END) = 0 THEN 'needs_internal'
    ELSE 'needs_external'
  END AS coverage_status
FROM resorts r
LEFT JOIN users u ON u.resort_id = r.id
GROUP BY r.id, r.name, r.status;

CREATE OR REPLACE VIEW mv_dashboard_kpi AS
SELECT 1 AS kpi_key,
  COUNT(*) AS total_bookings,
  SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) AS bookings_pending,
  SUM(CASE WHEN b.status = 'active' THEN 1 ELSE 0 END) AS bookings_active,
  SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS bookings_completed,
  SUM(CASE WHEN b.status IN ('cancelled_by_guest', 'cancelled_weather') THEN 1 ELSE 0 END) AS bookings_cancelled,
  SUM(CASE WHEN b.status = 'rescheduled' THEN 1 ELSE 0 END) AS bookings_rescheduled,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.invoice_total_usd ELSE 0 END), 0) AS total_revenue_usd,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.base_total_usd ELSE 0 END), 0) AS total_base_usd,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.service_charge_10_usd ELSE 0 END), 0) AS total_service_charge,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.gst_17_usd ELSE 0 END), 0) AS total_gst,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.operation_share_50_usd ELSE 0 END), 0) AS total_operation_share,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.company_share_50_usd ELSE 0 END), 0) AS total_company_share,
  COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.signed_by_guest THEN b.staff_commission_5_usd ELSE 0 END), 0) AS total_commissions_earned,
  (SELECT COUNT(*) FROM users WHERE role IN ('internal', 'external') AND status = 'active') AS active_staff_count,
  (SELECT COUNT(*) FROM resorts WHERE status = 'active') AS active_resorts_count,
  COALESCE((SELECT AVG(rating) FROM feedback_submissions), 0) AS avg_guest_rating,
  SUM(CASE WHEN YEAR(b.booking_date) = YEAR(CURRENT_DATE) AND MONTH(b.booking_date) = MONTH(CURRENT_DATE) THEN 1 ELSE 0 END) AS bookings_this_month,
  COALESCE(SUM(CASE WHEN b.status = 'completed' AND YEAR(b.booking_date) = YEAR(CURRENT_DATE)
    AND MONTH(b.booking_date) = MONTH(CURRENT_DATE) THEN b.invoice_total_usd ELSE 0 END), 0) AS revenue_this_month,
  CURRENT_TIMESTAMP(3) AS refreshed_at
FROM bookings b;

CREATE OR REPLACE VIEW mv_staff_performance AS
SELECT u.id AS user_id, u.name AS user_name, u.role AS user_role, COALESCE(r.name, 'N/A') AS resort_name,
  COUNT(b.id) AS total_bookings_handled,
  SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS completed_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.signed_by_guest THEN b.staff_commission_5_usd ELSE 0 END), 0) AS total_commission_usd,
  COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.signed_by_guest THEN 1 + 0.5 * b.child_count ELSE 0 END), 0) AS monthly_star_units,
  10 AS star_threshold,
  10 AS star_bonus_usd,
  LEAST(FLOOR(COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.signed_by_guest THEN 1 + 0.5 * b.child_count ELSE 0 END), 0) / 10), 5) AS full_stars,
  LEAST(FLOOR(COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.signed_by_guest THEN 1 + 0.5 * b.child_count ELSE 0 END), 0) / 10), 5) * 10 AS star_bonus_total_usd,
  MOD(COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.signed_by_guest THEN 1 + 0.5 * b.child_count ELSE 0 END), 0), 10) AS partial_progress_usd,
  COALESCE(AVG(fs.rating), 0) AS avg_guest_rating,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.adult_count + b.child_count ELSE 0 END), 0) AS total_guests_served,
  MAX(b.booking_date) AS last_booking_date
FROM users u
LEFT JOIN bookings b ON b.staff_id = u.id
LEFT JOIN resorts r ON r.id = u.resort_id
LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id
WHERE u.role IN ('internal', 'external')
GROUP BY u.id, u.name, u.role, r.name;

CREATE OR REPLACE VIEW mv_resort_analytics AS
SELECT r.id AS resort_id, r.name AS resort_name, r.code AS resort_code,
  COUNT(b.id) AS total_bookings,
  SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS completed_bookings,
  SUM(CASE WHEN b.status IN ('cancelled_by_guest', 'cancelled_weather') THEN 1 ELSE 0 END) AS cancelled_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.invoice_total_usd ELSE 0 END), 0) AS total_revenue_usd,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.operation_share_50_usd ELSE 0 END), 0) AS total_operation_share,
  COALESCE(AVG(fs.rating), 0) AS avg_guest_rating,
  COALESCE(SUM(b.adult_count + b.child_count), 0) AS total_guests,
  (SELECT p2.name FROM bookings b2 JOIN packages p2 ON p2.id = b2.package_id
    WHERE b2.resort_id = r.id GROUP BY p2.name ORDER BY COUNT(*) DESC LIMIT 1) AS most_popular_package_name,
  (SELECT COUNT(*) FROM users u2 WHERE u2.resort_id = r.id
    AND u2.role IN ('internal', 'external') AND u2.status = 'active') AS active_staff_count
FROM resorts r
LEFT JOIN bookings b ON b.resort_id = r.id
LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id
GROUP BY r.id, r.name, r.code;

CREATE OR REPLACE VIEW mv_monthly_revenue AS
SELECT CAST(DATE_FORMAT(b.booking_date, '%Y-%m-01') AS DATE) AS month,
  YEAR(b.booking_date) AS year, MONTH(b.booking_date) AS month_number,
  COUNT(*) AS booking_count,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.invoice_total_usd ELSE 0 END), 0) AS revenue_usd,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.base_total_usd ELSE 0 END), 0) AS base_total_usd,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.service_charge_10_usd ELSE 0 END), 0) AS service_charge_usd,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.gst_17_usd ELSE 0 END), 0) AS gst_usd,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.operation_share_50_usd ELSE 0 END), 0) AS operation_share_usd,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.company_share_50_usd ELSE 0 END), 0) AS company_share_usd,
  COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.invoice_total_usd END), 0) AS avg_booking_value,
  COALESCE(SUM(b.adult_count + b.child_count), 0) AS guest_count
FROM bookings b
WHERE b.booking_date >= CURRENT_DATE - INTERVAL 11 MONTH
GROUP BY CAST(DATE_FORMAT(b.booking_date, '%Y-%m-01') AS DATE), YEAR(b.booking_date), MONTH(b.booking_date);

CREATE OR REPLACE VIEW mv_booking_pipeline AS
SELECT status, COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM bookings), 0), 2) AS percentage_of_total,
  COALESCE(AVG(invoice_total_usd), 0) AS avg_value_usd,
  (SELECT COUNT(*) FROM bookings) AS total_in_pipeline,
  ROUND((SELECT COUNT(*) FROM bookings WHERE status = 'completed') * 100.0 /
    NULLIF((SELECT COUNT(*) FROM bookings), 0), 2) AS conversion_rate
FROM bookings
GROUP BY status;
