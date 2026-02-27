#!/usr/bin/env node
/**
 * Simple script to create an admin user in the database.
 * Usage (set env vars or .env file):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME (optional)
 * Example:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=Secret123 node scripts/create-admin.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306');
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'quantumalphaindiadb';

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  if (!adminEmail || !adminPassword) {
    console.error('Please set ADMIN_EMAIL and ADMIN_PASSWORD environment variables');
    process.exit(1);
  }

  const conn = await mysql.createConnection({ host, port, user, password, database });

  try {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const useSeparate = process.env.ADMIN_USE_SEPARATE === '1' || process.env.ADMIN_USE_SEPARATE === 'true';

    if (useSeparate) {
      const query = `INSERT INTO admins (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, 'superadmin', 'Active', NOW())`;
      await conn.execute(query, [id, adminEmail, passwordHash, adminName]);
      console.log('Admin user created in `admins` table:', { id, email: adminEmail });
    } else {
      const query = `INSERT INTO users (id, email, password_hash, name, role, plan, status, created_at) VALUES (?, ?, ?, ?, 'admin', 'Pro', 'Active', NOW())`;
      await conn.execute(query, [id, adminEmail, passwordHash, adminName]);
      console.log('Admin user created in `users` table:', { id, email: adminEmail });
    }
  } catch (err) {
    console.error('Failed to create admin user:', err.message || err);
  } finally {
    await conn.end();
  }
}

main();
