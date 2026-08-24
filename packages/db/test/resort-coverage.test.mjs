import assert from 'node:assert/strict';
import test from 'node:test';

import {
  coverageRoleRemoved,
  resortCoverageStatus,
} from '../resort-coverage.js';

test('resort coverage requires active Internal and External staff', () => {
  assert.equal(resortCoverageStatus({ resortStatus: 'active', activeInternalCount: 1, activeExternalCount: 1 }), 'ready');
  assert.equal(resortCoverageStatus({ resortStatus: 'active', activeInternalCount: 0, activeExternalCount: 1 }), 'needs_internal');
  assert.equal(resortCoverageStatus({ resortStatus: 'active', activeInternalCount: 1, activeExternalCount: 0 }), 'needs_external');
  assert.equal(resortCoverageStatus({ resortStatus: 'active', activeInternalCount: 0, activeExternalCount: 0 }), 'needs_both');
  assert.equal(resortCoverageStatus({ resortStatus: 'inactive', activeInternalCount: 2, activeExternalCount: 2 }), 'inactive');
});

test('detects when an assignment removes active coverage from its original resort', () => {
  const before = { role: 'internal', status: 'active', resort_id: 'resort-a' };

  assert.equal(coverageRoleRemoved(before, { role: 'internal', status: 'inactive', resortId: 'resort-a' }), 'internal');
  assert.equal(coverageRoleRemoved(before, { role: 'external', status: 'active', resortId: 'resort-a' }), 'internal');
  assert.equal(coverageRoleRemoved(before, { role: 'internal', status: 'active', resortId: 'resort-b' }), 'internal');
  assert.equal(coverageRoleRemoved(before, { role: 'internal', status: 'active', resortId: 'resort-a' }), null);
});

test('admin and already inactive staff do not provide resort coverage', () => {
  assert.equal(coverageRoleRemoved({ role: 'admin', status: 'active', resort_id: null }, { role: 'admin', status: 'active', resortId: null }), null);
  assert.equal(coverageRoleRemoved({ role: 'external', status: 'inactive', resort_id: 'resort-a' }, { role: 'external', status: 'active', resortId: 'resort-b' }), null);
});
