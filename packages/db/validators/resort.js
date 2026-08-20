import { z } from 'zod';

const optionalEmail = z.preprocess(
  (value) => value === '' || value == null ? null : value,
  z.string().trim().email().max(254).nullable(),
);

export const resortSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9-]+$/),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  location: z.string().trim().max(200).default('Maldives'),
  timezone: z.string().trim().max(80).default('Indian/Maldives'),
  contactName: z.string().trim().max(120).default(''),
  contactPhone: z.string().trim().max(40).default(''),
  contactEmail: optionalEmail.default(null),
  whatsappNumber: z.string().trim().max(40).default(''),
  observationSpots: z.string().trim().max(1000).default(''),
  latitude: z.coerce.number().min(-90).max(90).default(5.2893),
  longitude: z.coerce.number().min(-180).max(180).default(73.5358),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateResortSchema = resortSchema.partial();
