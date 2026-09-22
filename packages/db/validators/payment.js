import { z } from "zod";

import { cleanTextSchema } from "./common.js";

export const confirmCustomerPaymentSchema = z
  .object({
    paymentMethod: z.enum(["Bank transfer", "Cash"]),
    reference: cleanTextSchema(120),
    notes: cleanTextSchema(500),
    taxType: z.enum(["none", "tgst", "vat", "sales_tax", "custom"]).optional(),
    taxLabel: cleanTextSchema(80),
    taxRatePercent: z.coerce.number().finite().min(0).max(100).optional(),
  })
  .superRefine((value, context) => {
    if (value.taxType === "custom" && !value.taxLabel) {
      context.addIssue({
        code: "custom",
        message: "A name is required for a custom tax.",
        path: ["taxLabel"],
      });
    }
  });
