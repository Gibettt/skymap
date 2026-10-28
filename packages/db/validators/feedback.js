import { z } from 'zod';
import { cleanTextSchema } from './common.js';

export const submitFeedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating harus 1-5').max(5, 'Rating harus 1-5'),
  comment: cleanTextSchema(1000),
});

export const staffReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be 1 to 5 stars').max(5, 'Rating must be 1 to 5 stars'),
  comment: cleanTextSchema(1000),
}).strict();
