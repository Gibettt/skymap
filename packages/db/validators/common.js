import { z } from 'zod';

export const uuidSchema = z.string().trim().uuid('ID tidak valid');

export const emailSchema = z
  .string()
  .trim()
  .email('Format email tidak valid')
  .max(254)
  .transform((value) => value.toLowerCase());

export const cleanTextSchema = (max = 500) =>
  z
    .preprocess((value) => (value === '' ? null : value), z.string().trim().max(max).optional().nullable())
    .transform((value) => value || null);

export const cleanListSchema = (max = 12) =>
  z
    .array(z.string().trim())
    .max(max)
    .transform((items) => items.filter(Boolean))
    .optional()
    .default([]);

export const numberSchema = (message = 'Angka tidak valid') =>
  z.coerce.number(message).refine(Number.isFinite, message);

export const moneySchema = numberSchema().min(0, 'Nominal tidak boleh negatif');

export const dateSchema = z.string().trim().date('Format tanggal tidak valid (YYYY-MM-DD)');

export const timeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format waktu tidak valid (HH:MM)');
