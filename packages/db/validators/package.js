import { z } from 'zod';
import { cleanTextSchema, moneySchema, uuidSchema } from './common.js';
import {
  MAX_PACKAGE_INCLUSIONS,
  MAX_PACKAGE_INCLUSION_LENGTH,
  normalizePackageInclusions,
} from '../package-content.js';

export const packageTypeSchema = z.enum(['regular', 'private', 'kids']);
export const experienceTypeSchema = z.enum(['communal', 'private', 'kids']);

const nullableMoneySchema = z.preprocess(
  (value) => (value === '' ? null : value),
  moneySchema.optional().nullable(),
);

const inclusionSchema = z.string()
  .trim()
  .min(1, 'Isi inclusion tidak boleh kosong')
  .max(MAX_PACKAGE_INCLUSION_LENGTH, `Isi inclusion maksimal ${MAX_PACKAGE_INCLUSION_LENGTH} karakter`);

const packageFields = z.object({
  name: z.string().trim().min(1, 'Nama package wajib diisi').max(200),
  packageType: packageTypeSchema,
  experienceType: experienceTypeSchema,
  location: z.string().trim().min(1, 'Lokasi wajib diisi').max(120),
  description: cleanTextSchema(240),
  schedule: z.string().trim().min(1, 'Schedule wajib diisi').max(120, 'Schedule maksimal 120 karakter'),
  resortId: uuidSchema,
  isChargeable: z.boolean(),
  adultPriceUsd: moneySchema,
  childPriceUsd: nullableMoneySchema,
  childAgeRange: cleanTextSchema(80),
  inclusions: z.array(inclusionSchema)
    .max(MAX_PACKAGE_INCLUSIONS, `Maksimal ${MAX_PACKAGE_INCLUSIONS} inclusion`)
    .transform(normalizePackageInclusions),
  isActive: z.boolean(),
});

export const createPackageSchema = packageFields.extend({
  schedule: packageFields.shape.schedule.default('Upon request'),
  inclusions: packageFields.shape.inclusions.default([]),
  isChargeable: packageFields.shape.isChargeable.default(true),
  isActive: packageFields.shape.isActive.default(true),
});

export const updatePackageSchema = packageFields.partial();
