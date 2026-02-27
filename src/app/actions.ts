'use server'

import {
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
  createUser,
  getSubscription,
  createSubscription,
  updateSubscription,
  logAuditAction,
} from '@/lib/db-auth';
import { UserSchema, type User, type Subscription } from '@/lib/schema';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { verifyJWT } from '@/lib/jwt';
import { addMonths } from 'date-fns';

// Helper to get the current user's ID from the JWT token
async function getCurrentUserId() {
  const authorization = headers().get('Authorization');
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.split('Bearer ')[1];
    try {
      const payload = await verifyJWT(token);
      if (payload) {
        return payload.userId;
      }
    } catch (error) {
      console.error('Error verifying token:', error);
    }
  }
  throw new Error('Unauthorized');
}

// Helper to verify admin role
async function verifyAdminRole() {
  const authorization = headers().get('Authorization');
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.split('Bearer ')[1];
    try {
      const payload = await verifyJWT(token);
      if (payload && payload.role === 'admin') {
        return payload.userId;
      }
    } catch (error) {
      console.error('Error verifying token:', error);
    }
  }
  throw new Error('Unauthorized or insufficient permissions');
}

// --- User Actions ---

export async function createUserInDb(userData: {
  id: string;
  email: string;
  name: string;
}) {
  // This is called only after user is created via API
  // The user record should already exist in the database
  const user = await getUserById(userData.id);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

export async function getUserSubscription(): Promise<Subscription | null> {
  const userId = await getCurrentUserId();
  return await getSubscription(userId);
}

export async function activateSubscription(
  planName: 'Starter' | 'Pro' | 'Expert'
) {
  const userId = await getCurrentUserId();

  // Create new subscription record
  const subscription = await createSubscription(userId, planName);

  // Update user's plan
  await updateUser(userId, { plan: planName });

  // Log the action
  await logAuditAction({
    userId,
    action: 'subscription_activated',
    entityType: 'subscription',
    entityId: subscription.id,
    changes: { plan: planName },
  });

  revalidatePath('/dashboard');
  return subscription;
}

export async function cancelSubscription(subscriptionId: string) {
  const userId = await getCurrentUserId();

  // Verify subscription belongs to user
  const subscription = await getSubscription(userId);
  if (!subscription || subscription.id !== subscriptionId) {
    throw new Error('Subscription not found or access denied');
  }

  // Cancel subscription
  await updateSubscription(subscriptionId, { status: 'Cancelled' });

  // Update user plan to Starter
  await updateUser(userId, { plan: 'Starter' });

  // Log the action
  await logAuditAction({
    userId,
    action: 'subscription_cancelled',
    entityType: 'subscription',
    entityId: subscriptionId,
    changes: { status: 'Cancelled' },
  });

  revalidatePath('/dashboard');
}

// --- Admin Actions ---

export async function getUsers(): Promise<User[]> {
  await verifyAdminRole();
  return getAllUsers();
}

export async function addUser(data: {
  name: string;
  email: string;
  password?: string;
  plan: User['plan'];
}) {
  await verifyAdminRole();

  if (!data.password) {
    throw new Error('Password is required to create a new user.');
  }

  // Create user with the database function
  const user = await createUser({
    name: data.name,
    email: data.email,
    password: data.password,
    plan: data.plan,
    role: 'user',
  });

  // Log the action
  await logAuditAction({
    action: 'user_created',
    entityType: 'user',
    entityId: user.id,
    changes: { email: data.email, name: data.name },
  });

  revalidatePath('/admin/dashboard');
  return user;
}

export async function updateUserAction(
  userId: string,
  data: Partial<Pick<User, 'name' | 'email' | 'plan' | 'status'>>
) {
  await verifyAdminRole();

  await updateUser(userId, data);

  // Log the action
  await logAuditAction({
    action: 'user_updated',
    entityType: 'user',
    entityId: userId,
    changes: data,
  });

  revalidatePath('/admin/dashboard');
}

export async function deleteUserAction(userId: string) {
  await verifyAdminRole();

  await deleteUser(userId);

  // Log the action
  await logAuditAction({
    action: 'user_deleted',
    entityType: 'user',
    entityId: userId,
    changes: { deleted: true },
  });

  revalidatePath('/admin/dashboard');
}
