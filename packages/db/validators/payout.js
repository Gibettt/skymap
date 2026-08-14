import { z } from 'zod';
import { cleanTextSchema, moneySchema } from './common.js';

export const createPayoutRequestSchema = z.object({
  amountUsd: moneySchema.gt(0, 'Nominal harus lebih dari 0'),
  paymentMethod: z.string().trim().min(1, 'Metode pembayaran wajib diisi').max(40),
  accountName: z.string().trim().min(1, 'Nama akun wajib diisi').max(120),
  accountNumber: z.string().trim().min(1, 'Nomor akun wajib diisi').max(120),
  notes: cleanTextSchema(500),
});

export const reviewPayoutSchema = z.object({
  status: z.enum(['approved', 'paid', 'rejected']),
  adminNotes: cleanTextSchema(500),
});
