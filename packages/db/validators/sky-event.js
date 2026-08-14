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
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, 'URL sumber tidak valid'),
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
