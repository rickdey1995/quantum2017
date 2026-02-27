/**
 * Admin Login API Route
 * Authenticates an admin user and returns a JWT token
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, updateLastLogin, logAuditAction } from '@/lib/db-auth';
import { createJWT } from '@/lib/jwt';
import { executeQuery, executeUpdate } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Try separate `admins` table first, then fall back to `users` table.
    const adminResults = await executeQuery(
      `SELECT id, email, password_hash, name, role, status FROM admins WHERE email = ?`,
      [email]
    );

    let user = adminResults.length > 0 ? adminResults[0] : null;

    if (!user) {
      const userResults = await executeQuery(
        `SELECT id, email, password_hash, name, role, plan, status FROM users WHERE email = ?`,
        [email]
      );
      user = userResults.length > 0 ? userResults[0] : null;
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);
    if (!passwordMatches) {
      await logAuditAction({
        action: 'admin_login_failed',
        entityType: 'user',
        entityId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Ensure this user is an admin (accept 'admin' or 'superadmin')
    const roleVal = (user.role || '').toString();
    if (!(roleVal === 'admin' || roleVal === 'superadmin')) {
      await logAuditAction({
        userId: user.id,
        action: 'admin_login_forbidden',
        entityType: 'user',
        entityId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 });
    }

    if (user.status === 'Cancelled') {
      return NextResponse.json({ error: 'Account has been cancelled' }, { status: 403 });
    }

    // Update last_login on the appropriate table
    try {
      if (adminResults.length > 0) {
        await executeUpdate('UPDATE admins SET last_login = NOW() WHERE id = ?', [user.id]);
      } else {
        await updateLastLogin(user.id);
      }
    } catch (e) {
      console.warn('Could not update last login:', e);
    }

    const token = await createJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await logAuditAction({
      userId: user.id,
      action: 'admin_login',
      entityType: 'user',
      entityId: user.id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          plan: user.plan,
          status: user.status,
        },
        token,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
