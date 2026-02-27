-- Separate Admins Schema
-- This file creates a dedicated `admins` table and related session tracking.
-- Use this if you prefer admins to be stored separately from regular users.

CREATE TABLE IF NOT EXISTS admins (
  id VARCHAR(255) PRIMARY KEY COMMENT 'Unique admin ID (UUID)',
  email VARCHAR(255) NOT NULL UNIQUE COMMENT 'Admin email address',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Hashed password using bcrypt',
  name VARCHAR(255) NOT NULL COMMENT 'Admin full name',
  role ENUM('superadmin','admin') DEFAULT 'admin' COMMENT 'Admin role',
  status ENUM('Active','Suspended','Cancelled') DEFAULT 'Active' COMMENT 'Admin account status',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  last_login TIMESTAMP NULL COMMENT 'Last login timestamp',
  INDEX idx_admin_email (email),
  INDEX idx_admin_status (status),
  INDEX idx_admin_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dedicated administrators table';

-- Optional: admin sessions table for tracking admin sessions separately
CREATE TABLE IF NOT EXISTS admin_sessions (
  id VARCHAR(255) PRIMARY KEY COMMENT 'Unique session ID (UUID)',
  admin_id VARCHAR(255) NOT NULL COMMENT 'Reference to admins table',
  session_token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Session token',
  user_agent VARCHAR(500) COMMENT 'User agent string',
  ip_address VARCHAR(45) COMMENT 'IP address',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Session created at',
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last activity',
  expires_at TIMESTAMP NULL COMMENT 'Session expiration timestamp',
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_admin_session_token (session_token),
  INDEX idx_admin_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin session management table';

-- Example pre-created admin (optional). Replace or remove for production.
-- Password hash below corresponds to bcrypt hash of 'admin@123' (same as default in main schema)
INSERT INTO admins (id, email, password_hash, name, role, status) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'admin-separate@quantumalphaindia.com',
  '$2a$10$GI8LTh9dR/ANfcThNM5EWOg70XnQ6hqQHXrpo72lDpY5WOk2Rspw2',
  'Separate Admin',
  'superadmin',
  'Active'
);

-- Notes:
-- - If you migrate to this separate table, update authentication and admin-creation scripts to insert into `admins` instead of `users`.
-- - Keep your phpMyAdmin connected to the same DB to view these tables.
