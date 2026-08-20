import { z } from 'zod';

export const updateRewardSettingsSchema = z.object({
  starAdultUnit: z.coerce.number().min(0).max(100),
  starChildUnit: z.coerce.number().min(0).max(100),
  starThreshold: z.coerce.number().gt(0).max(10000),
  starBonusUsd: z.coerce.number().min(0).max(100000),
});
