-- CloudPanel MySQL Database Schema for Quantum Alpha India
-- This schema is compatible with phpMyAdmin
-- Admin account pre-configured: Email: admin@quantumalphaindia.com | Password: admin@123

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY COMMENT 'Unique user ID (UUID)',
  email VARCHAR(255) NOT NULL UNIQUE COMMENT 'User email address',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Hashed password using bcrypt',
  name VARCHAR(255) NOT NULL COMMENT 'User full name',
  role ENUM('admin', 'user') DEFAULT 'user' COMMENT 'User role',
  plan ENUM('Starter', 'Pro', 'Expert') DEFAULT 'Starter' COMMENT 'Subscription plan',
  status ENUM('Active', 'Cancelled') DEFAULT 'Active' COMMENT 'User account status',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  last_login TIMESTAMP NULL COMMENT 'Last login timestamp',
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User accounts table';

-- Pre-installed admin account
-- Email: admin@quantumalphaindia.com
-- Password: admin@123
INSERT INTO users (id, email, password_hash, name, role, plan, status) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@quantumalphaindia.com',
  '$2a$10$GI8LTh9dR/ANfcThNM5EWOg70XnQ6hqQHXrpo72lDpY5WOk2Rspw2',
  'Quantum Alpha Admin',
  'admin',
  'Starter',
  'Active'
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(255) PRIMARY KEY COMMENT 'Unique subscription ID (UUID)',
  user_id VARCHAR(255) NOT NULL COMMENT 'Reference to users table',
  plan ENUM('Starter', 'Pro', 'Expert') DEFAULT 'Starter' COMMENT 'Subscription plan',
  status ENUM('Active', 'Cancelled', 'Inactive') DEFAULT 'Inactive' COMMENT 'Subscription status',
  renewal_date TIMESTAMP NULL COMMENT 'Next renewal date',
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Subscription start date',
  end_date TIMESTAMP NULL COMMENT 'Subscription end date',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_renewal_date (renewal_date),
  UNIQUE KEY unique_active_subscription (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User subscriptions table';

-- Create trading sessions/instruments table (optional - for tracking trader activity)
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(255) PRIMARY KEY COMMENT 'Unique session ID (UUID)',
  user_id VARCHAR(255) NOT NULL COMMENT 'Reference to users table',
  session_token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Session token',
  user_agent VARCHAR(500) COMMENT 'User agent string',
  ip_address VARCHAR(45) COMMENT 'User IP address',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Session creation timestamp',
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last activity timestamp',
  expires_at TIMESTAMP NULL COMMENT 'Session expiration timestamp',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_session_token (session_token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User session management table';

-- Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY COMMENT 'Unique log ID (UUID)',
  user_id VARCHAR(255) COMMENT 'Reference to users table (nullable for system actions)',
  action VARCHAR(100) NOT NULL COMMENT 'Action performed (login, logout, update, delete, etc)',
  entity_type VARCHAR(50) COMMENT 'Type of entity affected (user, subscription, etc)',
  entity_id VARCHAR(255) COMMENT 'ID of entity affected',
  changes JSON COMMENT 'JSON object containing what changed',
  ip_address VARCHAR(45) COMMENT 'IP address of the action performer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Action timestamp',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit logs for tracking all significant actions';
