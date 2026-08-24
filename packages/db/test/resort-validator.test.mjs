import assert from 'node:assert/strict';
import test from 'node:test';
import { updateResortSchema } from '../validators/resort.js';

test('resort timezone must be a valid IANA timezone', () => {
  assert.equal(updateResortSchema.safeParse({ timezone: 'Indian/Maldives' }).success, true);
  assert.equal(updateResortSchema.safeParse({ timezone: 'Maldives/Invalid' }).success, false);
});
