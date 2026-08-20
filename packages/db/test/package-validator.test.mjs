import assert from 'node:assert/strict';
import test from 'node:test';
import { createPackageSchema, updatePackageSchema } from '../validators/package.js';

const validPackage = {
  name: 'Private Stargazing',
  packageType: 'private',
  experienceType: 'private',
  location: 'Palm Beach',
  description: 'Private guided observation.',
  schedule: 'Upon request | 21:00 - 22:00',
  resortId: '11111111-1111-4111-8111-111111111111',
  isChargeable: true,
  adultPriceUsd: 140,
  childPriceUsd: null,
  childAgeRange: '',
  isActive: true,
};

test('create package validates and normalizes ordered inclusions', () => {
  const parsed = createPackageSchema.parse({
    ...validPackage,
    inclusions: [' Beverages ', 'Astro portrait', 'Beverages'],
  });

  assert.deepEqual(parsed.inclusions, ['Beverages', 'Astro portrait']);
});

test('create package rejects more than twenty inclusions', () => {
  const result = createPackageSchema.safeParse({
    ...validPackage,
    inclusions: Array.from({ length: 21 }, (_, index) => `Item ${index + 1}`),
  });

  assert.equal(result.success, false);
});

test('create package rejects an inclusion longer than 120 characters', () => {
  const result = createPackageSchema.safeParse({
    ...validPackage,
    inclusions: ['x'.repeat(121)],
  });

  assert.equal(result.success, false);
});

test('partial package updates do not require inclusions', () => {
  assert.deepEqual(updatePackageSchema.parse({ isActive: false }), { isActive: false });
});

test('package schedule is trimmed and limited to 120 characters', () => {
  const parsed = createPackageSchema.parse({
    ...validPackage,
    schedule: '  Every Thursday | 19:30 - 20:30  ',
  });

  assert.equal(parsed.schedule, 'Every Thursday | 19:30 - 20:30');
  assert.equal(createPackageSchema.safeParse({ ...validPackage, schedule: '' }).success, false);
  assert.equal(createPackageSchema.safeParse({ ...validPackage, schedule: 'x'.repeat(121) }).success, false);
});
