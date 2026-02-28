/**
 * User authentication utilities
 * Handles password hashing, verification, and user operations with MySQL database
 */

import { executeQuery, executeInsert, executeUpdate, executeDelete } from './db';
import { hash, compare } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User, Subscription, Package } from './schema';

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
  plan?: 'Starter' | 'Pro' | 'Expert';
}): Promise<User> {
  const id = randomUUID();
  const passwordHash = await hashPassword(data.password);
  // role is always 'user' – admin accounts live in the separate admins
  // table and are created with the create-admin script.
  const role: 'user' = 'user';
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

// Admin operations ------------------------------------------------------------------
export async function getAdminById(id: string): Promise<User | null> {
  // The returned type aligns with UserSchema; plan is optional and
  // admin records don't normally have it. We default to undefined.
  const query = `
    SELECT id, email, name, role, status 
    FROM admins 
    WHERE id = ?
  `;

  const results = await executeQuery<{
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
  }>(query, [id]);

  if (results.length === 0) {
    return null;
  }

  const admin = results[0];
  // Cast to User type; plan will be undefined and that's acceptable. We
  // preserve the original role so that superadmins are distinguishable.
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: (admin.role as 'admin' | 'superadmin'),
    status: admin.status as 'Active' | 'Cancelled',
  } as User;
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

// returns each user along with their active subscription renewal date (if any)
export type UserWithSubscription = User & { renewal_date?: string };

export async function getAllUsersWithSubscription(): Promise<UserWithSubscription[]> {
  const query = `
    SELECT u.id, u.email, u.name, u.role, u.plan, u.status, s.renewal_date
    FROM users u
    LEFT JOIN subscriptions s
      ON s.user_id = u.id AND s.status = 'Active'
    ORDER BY u.created_at DESC
  `;

  return executeQuery<UserWithSubscription>(query);
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

// helper to convert JS date to MySQL DATETIME string (no timezone)
function toSqlDatetime(date: Date): string {
  // produces "YYYY-MM-DD HH:MM:SS" which MySQL accepts
  return date.toISOString().slice(0, 19).replace('T', ' ');
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

  const values = [id, userId, plan, toSqlDatetime(renewalDate)];

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
    // convert if it's a date string or Date
    const d = new Date(data.renewal_date);
    values.push(toSqlDatetime(d));
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

// --- Site Settings Operations ---

export async function getSiteSettings(): Promise<any | null> {
  const query = `SELECT data FROM site_settings LIMIT 1`;
  const results = await executeQuery<{ data: any }>(query);
  return results.length > 0 ? results[0].data : null;
}

export async function updateSiteSettings(newData: any): Promise<void> {
  // insert or update the single row
  const existing = await getSiteSettings();
  const json = JSON.stringify(newData);
  if (existing) {
    await executeUpdate(`UPDATE site_settings SET data = ?`, [json]);
  } else {
    await executeInsert(`INSERT INTO site_settings (data) VALUES (?)`, [json]);
  }
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
// --- Landing Page Image Operations ---

export interface LandingPageImageRecord {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  section: string;
  uploaded_by: string;
  upload_ip?: string;
  created_at: Date;
  updated_at: Date;
}

export async function saveLandingPageImage(data: {
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  section: string;
  uploaded_by: string;
  upload_ip?: string;
}): Promise<LandingPageImageRecord> {
  const id = randomUUID();

  const query = `
    INSERT INTO landing_page_images 
    (id, filename, original_filename, file_path, file_size, mime_type, section, uploaded_by, upload_ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id,
    data.filename,
    data.original_filename,
    data.file_path,
    data.file_size,
    data.mime_type,
    data.section,
    data.uploaded_by,
    data.upload_ip || null,
  ];

  await executeInsert(query, values);

  return {
    id,
    filename: data.filename,
    original_filename: data.original_filename,
    file_path: data.file_path,
    file_size: data.file_size,
    mime_type: data.mime_type,
    section: data.section,
    uploaded_by: data.uploaded_by,
    upload_ip: data.upload_ip,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

export async function getLandingPageImages(section?: string): Promise<LandingPageImageRecord[]> {
  let query = `SELECT * FROM landing_page_images`;
  const values: any[] = [];

  if (section) {
    query += ` WHERE section = ?`;
    values.push(section);
  }

  query += ` ORDER BY created_at DESC`;

  return executeQuery<LandingPageImageRecord>(query, values);
}

export async function getLandingPageImageById(id: string): Promise<LandingPageImageRecord | null> {
  const query = `SELECT * FROM landing_page_images WHERE id = ?`;
  const results = await executeQuery<LandingPageImageRecord>(query, [id]);
  return results.length > 0 ? results[0] : null;
}

export async function deleteLandingPageImage(id: string): Promise<void> {
  const query = `DELETE FROM landing_page_images WHERE id = ?`;
  await executeDelete(query, [id]);
}

// --- Package Operations ---

export async function createPackage(data: {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  features?: string[];
  display_order?: number;
  created_by?: string | null;
}): Promise<Package> {
  const id = randomUUID();
  const currency = data.currency || 'USD';
  const displayOrder = data.display_order ?? 0;
  const features = data.features ? JSON.stringify(data.features) : null;

  const query = `
    INSERT INTO packages 
    (id, name, description, price, currency, features, display_order, created_by, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
  `;

  const values = [
    id,
    data.name,
    data.description || null,
    data.price,
    currency,
    features,
    displayOrder,
    data.created_by || null,
  ];

  try {
    await executeInsert(query, values);

    return {
      id,
      name: data.name,
      description: data.description,
      price: data.price,
      currency,
      features: data.features,
      active: true,
      display_order: displayOrder,
      created_by: data.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error(`Package "${data.name}" already exists`);
    }
    throw error;
  }
}

export async function getAllPackages(activeOnly: boolean = false): Promise<Package[]> {
  let query = `SELECT * FROM packages`;
  const values: any[] = [];

  if (activeOnly) {
    query += ` WHERE active = TRUE`;
  }

  query += ` ORDER BY display_order ASC, created_at DESC`;

  const results = await executeQuery<any>(query, values);
  return results.map(pkg => {
    let features: string[] = [];
    if (pkg.features) {
      try {
        features = JSON.parse(pkg.features);
      } catch (e) {
        // fallback: treat raw string as single feature if JSON is invalid
        features = [pkg.features];
        console.warn('Invalid JSON in package.features for id', pkg.id, e);
      }
    }
    return { ...pkg, features };
  });
}

export async function getPackageById(id: string): Promise<Package | null> {
  const query = `SELECT * FROM packages WHERE id = ?`;
  const results = await executeQuery<any>(query, [id]);

  if (results.length === 0) return null;

  const pkg = results[0];
  let features: string[] = [];
  if (pkg.features) {
    try {
      features = JSON.parse(pkg.features);
    } catch (e) {
      features = [pkg.features];
      console.warn('Invalid JSON in package.features for id', pkg.id, e);
    }
  }
  return { ...pkg, features };
}

export async function getPackageByName(name: string): Promise<Package | null> {
  const query = `SELECT * FROM packages WHERE name = ?`;
  const results = await executeQuery<any>(query, [name]);

  if (results.length === 0) return null;

  const pkg = results[0];
  let features: string[] = [];
  if (pkg.features) {
    try {
      features = JSON.parse(pkg.features);
    } catch (e) {
      features = [pkg.features];
      console.warn('Invalid JSON in package.features for id', pkg.id, e);
    }
  }
  return { ...pkg, features };
}

export async function updatePackage(
  id: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    features?: string[];
    active?: boolean;
    display_order?: number;
  }
): Promise<Package | null> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description || null);
  }
  if (data.price !== undefined) {
    updates.push('price = ?');
    values.push(data.price);
  }
  if (data.currency !== undefined) {
    updates.push('currency = ?');
    values.push(data.currency);
  }
  if (data.features !== undefined) {
    updates.push('features = ?');
    values.push(JSON.stringify(data.features));
  }
  if (data.active !== undefined) {
    updates.push('active = ?');
    values.push(data.active);
  }
  if (data.display_order !== undefined) {
    updates.push('display_order = ?');
    values.push(data.display_order);
  }

  if (updates.length === 0) {
    return getPackageById(id);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const query = `UPDATE packages SET ${updates.join(', ')} WHERE id = ?`;

  try {
    await executeUpdate(query, values);
    return getPackageById(id);
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('A package with this name already exists');
    }
    throw error;
  }
}

export async function deletePackage(id: string): Promise<void> {
  const query = `DELETE FROM packages WHERE id = ?`;
  await executeDelete(query, [id]);
}

export async function updatePackageDisplayOrder(id: string, order: number): Promise<void> {
  const query = `UPDATE packages SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  await executeUpdate(query, [order, id]);
}
