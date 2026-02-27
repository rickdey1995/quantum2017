/**
 * User authentication utilities
 * Handles password hashing, verification, and user operations with MySQL database
 */

import { executeQuery, executeInsert, executeUpdate, executeDelete } from './db';
import { hash, compare } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User, Subscription } from './schema';

const BCRYPT_ROUNDS = 10;

// --- Password Management ---

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return compare(password, passwordHash);
}

// --- User Operations ---

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
  plan?: 'Starter' | 'Pro' | 'Expert';
}): Promise<User> {
  const id = randomUUID();
  const passwordHash = await hashPassword(data.password);
  const role = data.role || 'user';
  const plan = data.plan || 'Starter';

  const query = `
    INSERT INTO users 
    (id, email, password_hash, name, role, plan, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Active')
  `;

  const values = [id, data.email, passwordHash, data.name, role, plan];

  try {
    await executeInsert(query, values);

    return {
      id,
      email: data.email,
      name: data.name,
      role,
      plan,
      status: 'Active',
    };
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('Email already exists');
    }
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const query = `
    SELECT id, email, name, role, plan, status 
    FROM users 
    WHERE email = ?
  `;

  const results = await executeQuery<User>(query, [email]);
  return results.length > 0 ? results[0] : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const query = `
    SELECT id, email, name, role, plan, status 
    FROM users 
    WHERE id = ?
  `;

  const results = await executeQuery<User>(query, [id]);
  return results.length > 0 ? results[0] : null;
}

export async function getUserWithPassword(
  email: string
): Promise<(User & { password_hash: string }) | null> {
  const query = `
    SELECT id, email, password_hash, name, role, plan, status 
    FROM users 
    WHERE email = ?
  `;

  const results = await executeQuery<User & { password_hash: string }>(
    query,
    [email]
  );
  return results.length > 0 ? results[0] : null;
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, 'name' | 'email' | 'plan' | 'status'>>
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.email !== undefined) {
    updates.push('email = ?');
    values.push(data.email);
  }
  if (data.plan !== undefined) {
    updates.push('plan = ?');
    values.push(data.plan);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }

  if (updates.length === 0) return;

  values.push(id);
  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

  await executeUpdate(query, values);
}

export async function updateUserPassword(
  id: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  const query = 'UPDATE users SET password_hash = ? WHERE id = ?';
  await executeUpdate(query, [passwordHash, id]);
}

export async function deleteUser(id: string): Promise<void> {
  await executeDelete('DELETE FROM users WHERE id = ?', [id]);
}

export async function getAllUsers(): Promise<User[]> {
  const query = `
    SELECT id, email, name, role, plan, status 
    FROM users 
    ORDER BY created_at DESC
  `;

  return executeQuery<User>(query);
}

export async function updateLastLogin(id: string): Promise<void> {
  const query = 'UPDATE users SET last_login = NOW() WHERE id = ?';
  await executeUpdate(query, [id]);
}

// --- Subscription Operations ---

export async function getSubscription(
  userId: string
): Promise<Subscription | null> {
  const query = `
    SELECT id, plan, status, renewal_date 
    FROM subscriptions 
    WHERE user_id = ? AND status = 'Active'
    LIMIT 1
  `;

  const results = await executeQuery<Subscription>(query, [userId]);
  return results.length > 0 ? results[0] : null;
}

export async function createSubscription(
  userId: string,
  plan: 'Starter' | 'Pro' | 'Expert'
): Promise<Subscription> {
  const id = randomUUID();
  const renewalDate = new Date();
  renewalDate.setMonth(renewalDate.getMonth() + 1);

  const query = `
    INSERT INTO subscriptions 
    (id, user_id, plan, status, renewal_date, start_date)
    VALUES (?, ?, ?, 'Active', ?, NOW())
  `;

  const values = [id, userId, plan, renewalDate.toISOString()];

  await executeInsert(query, values);

  return {
    id,
    plan,
    status: 'Active',
    renewal_date: renewalDate.toISOString(),
  };
}

export async function updateSubscription(
  subscriptionId: string,
  data: Partial<Pick<Subscription, 'plan' | 'status' | 'renewal_date'>>
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.plan !== undefined) {
    updates.push('plan = ?');
    values.push(data.plan);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.renewal_date !== undefined) {
    updates.push('renewal_date = ?');
    values.push(data.renewal_date);
  }

  if (updates.length === 0) return;

  values.push(subscriptionId);
  const query = `UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ?`;

  await executeUpdate(query, values);
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const query =
    "UPDATE subscriptions SET status = 'Cancelled' WHERE id = ?";
  await executeUpdate(query, [subscriptionId]);
}

// --- Session Operations ---

export async function createSession(
  userId: string,
  sessionToken: string,
  expiresAt: Date,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const id = randomUUID();

  const query = `
    INSERT INTO user_sessions 
    (id, user_id, session_token, user_agent, ip_address, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const values = [id, userId, sessionToken, userAgent, ipAddress, expiresAt];

  await executeInsert(query, values);
  return id;
}

export async function getSessionByToken(
  sessionToken: string
): Promise<{ id: string; user_id: string; expires_at: Date } | null> {
  const query = `
    SELECT id, user_id, expires_at 
    FROM user_sessions 
    WHERE session_token = ? AND expires_at > NOW()
  `;

  const results = await executeQuery<{
    id: string;
    user_id: string;
    expires_at: Date;
  }>(query, [sessionToken]);

  return results.length > 0 ? results[0] : null;
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  const query =
    'UPDATE user_sessions SET last_activity = NOW() WHERE id = ?';
  await executeUpdate(query, [sessionId]);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await executeDelete('DELETE FROM user_sessions WHERE id = ?', [sessionId]);
}

export async function deleteExpiredSessions(): Promise<void> {
  await executeDelete('DELETE FROM user_sessions WHERE expires_at <= NOW()');
}

// --- Audit Logging ---

export async function logAuditAction(data: {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
}): Promise<void> {
  const id = randomUUID();

  const query = `
    INSERT INTO audit_logs 
    (id, user_id, action, entity_type, entity_id, changes, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  // Ensure we don't violate the foreign key on audit_logs.user_id
  // If a userId is provided but does not exist in `users` (e.g., it's an admin from a separate table),
  // store NULL in the `user_id` column and keep the entityId to reference the admin.
  let userIdToInsert: string | null = null;
  if (data.userId) {
    try {
      const existing = await executeQuery(`SELECT id FROM users WHERE id = ?`, [data.userId]);
      if (existing && existing.length > 0) {
        userIdToInsert = data.userId;
      } else {
        userIdToInsert = null;
      }
    } catch (e) {
      userIdToInsert = null;
    }
  }

  const values = [
    id,
    userIdToInsert,
    data.action,
    data.entityType || null,
    data.entityId || null,
    data.changes ? JSON.stringify(data.changes) : null,
    data.ipAddress || null,
  ];

  await executeInsert(query, values);
}

// --- Password Update ---

export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const passwordHash = await hashPassword(newPassword);
  const query = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  await executeUpdate(query, [passwordHash, userId]);
}
