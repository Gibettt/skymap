import { z } from "zod";

import { uuidSchema } from "./common.js";

export const issueInvoiceSchema = z.object({
	type: z.enum(["customer", "staff_payout"]),
	sourceId: uuidSchema,
});
