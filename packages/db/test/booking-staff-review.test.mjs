import assert from 'node:assert/strict';
import test from 'node:test';

import { attachStaffReviews, staffReviewError } from '../bookings.js';
import { staffReviewSchema } from '../validators/feedback.js';

const external = { id: 'external-1', role: 'external' };

test('only the external staff who booked it can rate a completed booking', () => {
  const completed = { staff_id: 'external-1', status: 'completed' };

  assert.equal(staffReviewError(external, completed), null);
  assert.equal(staffReviewError({ id: 'internal-1', role: 'internal' }, completed).status, 403);
  assert.equal(staffReviewError(external, { ...completed, staff_id: 'someone-else' }).status, 403);
  assert.equal(staffReviewError(external, { ...completed, status: 'active' }).status, 409);
  assert.equal(staffReviewError(external, null).status, 403);
});

test('ratings are 1 to 5 whole stars with an optional comment', () => {
  assert.deepEqual(staffReviewSchema.parse({ rating: '4', comment: '  Great guide  ' }), { rating: 4, comment: 'Great guide' });
  assert.equal(staffReviewSchema.parse({ rating: 5, comment: '' }).comment, null);
  for (const rating of [0, 6, 3.5, 'abc']) assert.equal(staffReviewSchema.safeParse({ rating }).success, false);
  assert.equal(staffReviewSchema.safeParse({ rating: 5, bookingId: 'x' }).success, false);
});

test('booking lists carry their staff review, or null when there is none', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push(params);
      return { rows: [{ booking_id: 'b1', rating: '5', comment: 'Lovely night', reviewer_name: 'Budi', updated_at: '2026-10-29T10:00:00.000Z' }] };
    },
  };

  const result = await attachStaffReviews(client, [{ id: 'b1' }, { id: 'b2' }]);

  assert.deepEqual(calls, [[['b1', 'b2']]]);
  assert.deepEqual(result[0].staff_review, { rating: 5, comment: 'Lovely night', reviewerName: 'Budi', updatedAt: '2026-10-29T10:00:00.000Z' });
  assert.equal(result[1].staff_review, null);
  assert.deepEqual(await attachStaffReviews(client, []), []);
  assert.equal(calls.length, 1);
});
