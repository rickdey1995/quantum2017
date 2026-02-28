import { z } from 'zod';

export const PlanSchema = z.object({
  name: z.enum(['Starter', 'Pro', 'Expert']),
  price: z.string(),
  features: z.array(z.string()),
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  plan: z.enum(['Starter', 'Pro', 'Expert']),
  status: z.enum(['Active', 'Cancelled', 'Inactive']),
  renewal_date: z.string().optional(), // Stored as ISO string
});

export const UserSchema = z.object({
  id: z.string(), // UUID from database
  name: z.string(),
  email: z.string().email(),
  plan: z.enum(['Starter', 'Pro', 'Expert']).optional().default('Starter'),
  status: z.enum(['Active', 'Cancelled']).optional().default('Active'),
  role: z.enum(['user', 'admin', 'superadmin']).default('user'),
  subscription: SubscriptionSchema.optional(),
});

export type Plan = z.infer<typeof PlanSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type User = z.infer<typeof UserSchema>;

// schema for trading packages
export const PackageSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().min(0),
  currency: z.string().default('USD'),
  features: z.array(z.string()).optional(),
  active: z.boolean().default(true),
  display_order: z.number().int().default(0),
  created_by: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Package = z.infer<typeof PackageSchema>;

// schema for editable landing page/site-wide settings stored as JSON
export const LandingSettingsSchema = z.object({
  hero: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    buttonText: z.string().optional(),
    image: z.string().optional(),
  }).optional(),
  stats: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  trust: z.object({
    title: z.string(),
    points: z.array(z.string()).optional(),
    image: z.string().optional(),
  }).optional(),
  why: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    items: z.array(z.string()).optional(),
  }).optional(),
  leadersTitle: z.string().optional(),
  instrumentsTitle: z.string().optional(),
  benefits: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    items: z.array(z.string()).optional(),
  }).optional(),
  design: z.object({
    globalFont: z.string().optional(),
  }).optional(),
});

export type LandingSettings = z.infer<typeof LandingSettingsSchema>;
