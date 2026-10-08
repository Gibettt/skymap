import { z } from "zod";

import { uuidSchema } from "./common.js";

export const issueInvoiceSchema = z.object({
  type: z.enum(["customer", "staff_payout"]),
  sourceId: uuidSchema,
});

export const signInvoiceSchema = z.object({
  signatureDataUrl: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
});

export const invoiceResortStatusSchema = z.object({
  recorded: z.boolean(),
});

export const monthlyInvoiceSubmissionSchema = z.object({
  period: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/),
});

export const monthlyInvoiceSignatureSchema = monthlyInvoiceSubmissionSchema.extend({
  signatureDataUrl: signInvoiceSchema.shape.signatureDataUrl,
});

export const monthlyInvoiceReviewSchema = z.object({
  reviewed: z.boolean(),
  signatureDataUrl: z.string().nullable().optional(),
  signerName: z.string().max(200).nullable().optional(),
  resortId: z.string().uuid().optional(),
  periodStart: z.string().optional(),
});
