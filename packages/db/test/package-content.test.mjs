import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatPackageInclusions,
  normalizePackageInclusions,
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
