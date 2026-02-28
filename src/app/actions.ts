'use server'

import {
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
  // extended list
  getAllUsersWithSubscription,
  createUser,
  getSubscription,
  createSubscription,
  updateSubscription,
  logAuditAction,
  updatePassword,
  updateSiteSettings,
  getSiteSettings,
  createPackage,
  getAllPackages,
  getPackageById,
  updatePackage,
  deletePackage,
} from '@/lib/db-auth';
import { UserSchema, type User, type Subscription, type Package } from '@/lib/schema';
import { revalidatePath } from 'next/cache';
import { verifyJWT } from '@/lib/jwt';

// Helper to get the current user's ID from the JWT token
async function getCurrentUserId(token: string) {
  if (!token) {
    throw new Error('No token provided');
  }
  try {
    const payload = await verifyJWT(token);
    if (payload) {
      return payload.userId;
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    throw new Error('Invalid token');
  }
}

// Helper to verify admin role
async function verifyAdminRole(token: string) {
  if (!token) {
    throw new Error('No token provided');
  }
  try {
    const payload = await verifyJWT(token);
    // accept both admin and superadmin roles
    if (payload && (payload.role === 'admin' || payload.role === 'superadmin')) {
      return payload.userId;
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    throw new Error('Invalid token');
  }
  throw new Error('Unauthorized or insufficient permissions');
}

// Helper to get user role from token
async function getUserRole(token: string) {
  if (!token) {
    throw new Error('No token provided');
  }
  try {
    const payload = await verifyJWT(token);
    if (payload) {
      return payload.role;
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    throw new Error('Invalid token');
  }
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

export async function getUserSubscription(token: string): Promise<Subscription | null> {
  const userId = await getCurrentUserId(token);
  return await getSubscription(userId);
}

export async function activateSubscription(
  token: string,
  planName: 'Starter' | 'Pro' | 'Expert'
) {
  const userId = await getCurrentUserId(token);

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

export async function cancelSubscription(token: string, subscriptionId: string) {
  const userId = await getCurrentUserId(token);

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

export async function getUsers(token: string): Promise<User[]> {
  await verifyAdminRole(token);
  return getAllUsers();
}

// new action used by admin dashboard to include renewal date
export async function getUsersWithSubscriptions(token: string): Promise<(User & { renewal_date?: string })[]> {
  await verifyAdminRole(token);
  return getAllUsersWithSubscription();
}

export async function addUser(
  token: string,
  data: {
    name: string;
    email: string;
    password?: string;
    plan: User['plan'];
  }
) {
  await verifyAdminRole(token);

  if (!data.password) {
    throw new Error('Password is required to create a new user.');
  }

  // Create user with the database function
  const user = await createUser({
    name: data.name,
    email: data.email,
    password: data.password,
    plan: data.plan,
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
  token: string,
  userId: string,
  data: Partial<Pick<User, 'name' | 'email' | 'plan' | 'status'>>
) {
  await verifyAdminRole(token);

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

export async function deleteUserAction(token: string, userId: string) {
  await verifyAdminRole(token);

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

// --- Landing Page / Site Settings (admin only) ---

export async function getLandingSettings(): Promise<any> {
  // no authentication; public read
  return await getSiteSettings();
}

export async function updateLandingSettings(
  token: string,
  settings: any
) {
  await verifyAdminRole(token);
  await updateSiteSettings(settings);

  // log audit entry
  await logAuditAction({
    action: 'landing_settings_updated',
    entityType: 'site_settings',
    changes: settings,
  });

  revalidatePath('/');
}

// --- Admin Account Settings ---

export async function changeAdminPassword(
  token: string,
  newPassword: string
) {
  const userId = await verifyAdminRole(token);

  // Update password using utility function
  await updatePassword(userId, newPassword);

  // Log the action
  await logAuditAction({
    userId,
    action: 'admin_password_changed',
    entityType: 'user',
    entityId: userId,
    changes: { password_updated: true },
  });

  revalidatePath('/admin/dashboard');
  return { success: true, message: 'Password changed successfully' };
}
// --- Package Management ---

export async function getPackagesAction(): Promise<Package[]> {
  // Public read - no authentication needed
  return getAllPackages(false);
}

export async function getActivePackagesAction(): Promise<Package[]> {
  // Public read - get only active packages
  return getAllPackages(true);
}

export async function createPackageAction(
  token: string,
  data: {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    features?: string[];
    display_order?: number;
  }
) {
  const userId = await verifyAdminRole(token);

  const pkg = await createPackage({
    ...data,
    created_by: null, // Admin ID is tracked in audit logs, not in users table
  });

  // Log the action
  await logAuditAction({
    userId,
    action: 'package_created',
    entityType: 'package',
    entityId: pkg.id,
    changes: { name: pkg.name, price: pkg.price },
  });

  revalidatePath('/admin/dashboard');
  revalidatePath('/');
  return pkg;
}

export async function updatePackageAction(
  token: string,
  packageId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    features?: string[];
    active?: boolean;
    display_order?: number;
  }
) {
  const userId = await verifyAdminRole(token);

  const pkg = await updatePackage(packageId, data);

  if (!pkg) {
    throw new Error('Package not found');
  }

  // Log the action
  await logAuditAction({
    userId,
    action: 'package_updated',
    entityType: 'package',
    entityId: packageId,
    changes: data,
  });

  revalidatePath('/admin/dashboard');
  revalidatePath('/');
  return pkg;
}

export async function deletePackageAction(
  token: string,
  packageId: string
) {
  const userId = await verifyAdminRole(token);

  const pkg = await getPackageById(packageId);
  if (!pkg) {
    throw new Error('Package not found');
  }

  await deletePackage(packageId);

  // Log the action
  await logAuditAction({
    userId,
    action: 'package_deleted',
    entityType: 'package',
    entityId: packageId,
    changes: { name: pkg.name },
  });

  revalidatePath('/admin/dashboard');
  revalidatePath('/');
}

// --- Default Packages Seeding ---

export async function seedDefaultPackagesAction(token: string) {
  const userId = await verifyAdminRole(token);

  // Check if packages already exist
  const existingPackages = await getAllPackages(false);
  if (existingPackages.length > 0) {
    throw new Error(`Database already has ${existingPackages.length} package(s). Delete existing packages first to re-seed.`);
  }

  const defaultPackages = [
    {
      name: 'Desktop Software',
      description: 'Manage Yourself - Desktop Software for DIY traders with Community Access',
      price: 4999,
      currency: '₹',
      features: [
        'Desktop Software',
        'DIY',
        'Community Access',
        'Manage Yourself',
        'Local Execution',
      ],
      display_order: 0,
    },
    {
      name: 'Auto Server',
      description: 'Fully Automated Server based execution for hands-free trading',
      price: 5999,
      currency: '₹',
      features: [
        'Fully Automated',
        'Server based Execution',
        'Priority Support',
        '24/7 Monitoring',
        'Execution Management',
      ],
      display_order: 1,
    },
    {
      name: 'Hybrid Plan',
      description: 'Combination of Desktop Software and Server Execution',
      price: 7999,
      currency: '₹',
      features: [
        'Desktop Software',
        'Server Execution',
        'Advanced Analytics',
        'Priority Support',
        'API Access',
        'Custom Strategies',
      ],
      display_order: 2,
    },
  ];

  const createdPackages: Package[] = [];

  for (const pkgData of defaultPackages) {
    const pkg = await createPackage({
      ...pkgData,
      created_by: null, // Admin ID is tracked in audit logs
    });
    createdPackages.push(pkg);
  }

  // Log the seed action
  await logAuditAction({
    userId,
    action: 'packages_seeded',
    entityType: 'package',
    changes: { count: createdPackages.length, packages: createdPackages.map(p => p.name) },
  });

  revalidatePath('/admin/dashboard');
  revalidatePath('/');

  return {
    success: true,
    message: `Successfully created ${createdPackages.length} default packages`,
    packages: createdPackages,
  };
}
