import { z } from 'zod';
import { cleanTextSchema, moneySchema } from './common.js';

export const packageTypeSchema = z.enum(['regular', 'private', 'kids']);
export const experienceTypeSchema = z.enum(['communal', 'private', 'kids']);

const nullableMoneySchema = z.preprocess(
  (value) => (value === '' ? null : value),
  moneySchema.optional().nullable(),
);

export const createPackageSchema = z.object({
  name: z.string().trim().min(1, 'Nama package wajib diisi').max(200),
  packageType: packageTypeSchema,
  experienceType: experienceTypeSchema,
  location: z.string().trim().min(1, 'Lokasi wajib diisi').max(120),
  description: cleanTextSchema(240),
  adultPriceUsd: moneySchema,
  childPriceUsd: nullableMoneySchema,
  childAgeRange: cleanTextSchema(80),
  isActive: z.boolean().default(true),
});

export const updatePackageSchema = createPackageSchema.partial();
