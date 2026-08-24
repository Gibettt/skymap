import { z } from 'zod';
import { cleanTextSchema } from './common.js';

const validDateTime = (value) => !Number.isNaN(new Date(value).getTime());

const skyEventShape = {
  title: z.string().trim().min(1, 'Judul wajib diisi').max(120),
  eventType: z.enum(['astronomy', 'meteor', 'resort']),
  startsAt: z.string().refine(validDateTime, 'Waktu mulai tidak valid'),
  endsAt: cleanTextSchema(80).refine((value) => !value || validDateTime(value), 'Waktu selesai tidak valid'),
  description: cleanTextSchema(1500),
  sourceName: cleanTextSchema(120),
  sourceUrl: cleanTextSchema(500).refine((value) => {
    if (!value) return true;
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'URL sumber tidak valid'),
  imageUrl: cleanTextSchema(500).refine((value) => {
    if (!value) return true;
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'URL foto tidak valid'),
  packageId: z.preprocess((value) => value || null, z.string().uuid().nullable()).default(null),
  observationSpot: cleanTextSchema(120),
  capacity: z.preprocess((value) => value === '' || value == null ? null : value, z.coerce.number().int().min(1).nullable()).default(null),
  priceOverrideUsd: z.preprocess((value) => value === '' || value == null ? null : value, z.coerce.number().min(0).nullable()).default(null),
  status: z.enum(['draft', 'published', 'cancelled', 'sold_out']).default('published'),
  visibility: z.enum(['north', 'south', 'both']).default('both'),
  isPublished: z.boolean().default(true),
};

export const createSkyEventSchema = z.object(skyEventShape).refine((data) => {
  if (!data.endsAt) return true;
  return new Date(data.endsAt) > new Date(data.startsAt);
}, {
  message: 'Waktu selesai harus setelah waktu mulai',
  path: ['endsAt'],
});

export const updateSkyEventSchema = z.object(
  Object.fromEntries(Object.entries(skyEventShape).map(([key, schema]) => [key, schema.optional()]))
).refine((data) => {
  if (!data.startsAt || !data.endsAt) return true;
  return new Date(data.endsAt) > new Date(data.startsAt);
}, {
  message: 'Waktu selesai harus setelah waktu mulai',
  path: ['endsAt'],
});
