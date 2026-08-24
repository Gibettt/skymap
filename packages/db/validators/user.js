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
