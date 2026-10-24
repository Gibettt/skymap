import { z } from 'zod';
import { uuidSchema } from './common.js';

export const updateUserAssignmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).nullable().optional(),
  role: z.enum(['admin', 'internal', 'external']),
  status: z.enum(['active', 'inactive']),
  resortId: uuidSchema.nullable(),
});

export const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(40).nullable().optional(),
  role: z.enum(['internal', 'external']),
  status: z.enum(['active', 'inactive']).default('active'),
  resortId: uuidSchema,
  password: z.string().min(8).max(128),
});

export const externalRegistrationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(40).nullable().optional()
  ),
  resortId: uuidSchema,
  password: z.string().min(8).max(128),
}).strict();

export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128);

export const resetPasswordSchema = z.object({ password: passwordSchema }).strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password').max(128),
    newPassword: passwordSchema,
  })
  .strict()
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'The new password must be different from the current password',
    path: ['newPassword'],
  });
