import { z } from 'zod';
import { cleanTextSchema, moneySchema } from './common.js';

export const createPayoutRequestSchema = z.object({
  amountUsd: moneySchema.gt(0, 'Nominal harus lebih dari 0'),
  bankName: z.enum([
    'Bank of Maldives',
    'Maldives Islamic Bank',
    'State Bank of India (Maldives)',
  ]),
  accountHolderName: z.string().trim().min(1, 'Nama pemilik rekening wajib diisi').max(120),
  accountNumber: z.string().trim().min(1, 'Nomor akun wajib diisi').max(120),
  notes: cleanTextSchema(500),
});

export const reviewPayoutSchema = z.object({
  status: z.enum(['processed', 'completed', 'rejected']),
  adminNotes: cleanTextSchema(500),
});
