import assert from "node:assert/strict";
import test from "node:test";

import { payoutTransitionError, reviewPayoutSchema } from "../validators/payout.js";

test("payout review accepts only the supported finance actions", () => {
  assert.equal(reviewPayoutSchema.safeParse({ status: "processed" }).success, true);
  assert.equal(reviewPayoutSchema.safeParse({ status: "completed", adminNotes: "Transfer verified" }).success, true);
  assert.equal(reviewPayoutSchema.safeParse({ status: "requested" }).success, false);
});

test("payout transitions follow the requested, processed, and terminal lifecycle", () => {
  assert.equal(payoutTransitionError("requested", "processed"), null);
  assert.equal(payoutTransitionError("requested", "rejected"), null);
  assert.equal(payoutTransitionError("processed", "completed"), null);
  assert.equal(payoutTransitionError("processed", "rejected"), null);

  assert.match(payoutTransitionError("requested", "completed"), /processed payouts/i);
  assert.match(payoutTransitionError("processed", "processed"), /requested payouts/i);
  assert.match(payoutTransitionError("completed", "rejected"), /already closed/i);
  assert.match(payoutTransitionError("rejected", "processed"), /already closed/i);
});
