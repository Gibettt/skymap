import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatPackageInclusions,
  normalizePackageInclusions,
  packageIsChargeable,
} from '../package-content.js';

test('package inclusions are trimmed, empty values are removed, and duplicates are collapsed', () => {
  assert.deepEqual(
    normalizePackageInclusions([' Beverages ', '', 'Astro portrait', 'Beverages']),
    ['Beverages', 'Astro portrait'],
  );
});

test('non-array inclusion input is treated as an empty list', () => {
  assert.deepEqual(normalizePackageInclusions('Beverages'), []);
});

test('formatted inclusions use a readable separator and an explicit fallback', () => {
  assert.equal(formatPackageInclusions(['Beverages', 'Astro portrait']), 'Beverages, Astro portrait');
  assert.equal(formatPackageInclusions([], 'Details upon request'), 'Details upon request');
});

test('package price presence is the single source of truth for paid versus free', () => {
  assert.equal(packageIsChargeable('', null), false);
  assert.equal(packageIsChargeable(0, 0), false);
  assert.equal(packageIsChargeable(75, null), true);
  assert.equal(packageIsChargeable(0, 25), true);
});
