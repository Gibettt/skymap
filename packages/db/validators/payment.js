import { z } from "zod";

import { cleanTextSchema } from "./common.js";

export const confirmCustomerPaymentSchema = z.object({
	paymentMethod: z.enum(["Bank transfer", "Cash"]),
	reference: cleanTextSchema(120),
	notes: cleanTextSchema(500),
});
