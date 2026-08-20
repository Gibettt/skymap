import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLandingExperiences,
  packageToExperience,
} from '../src/lib/packagePresentation.js';

const staticExperience = {
  title: 'Beach Stargazing',
  schedule: 'Monday | 21:00 - 22:00',
  includes: 'Old static inclusion',
  image: '/static.jpg',
  description: 'Old static description',
};

const databasePackage = {
  id: 'package-1',
  name: 'Beach Stargazing',
  location: 'Palm Beach',
  description: 'Database description',
  schedule: 'Daily | 20:30 - 21:30',
  adult_price_usd: 90,
  child_price_usd: null,
  child_age_range: '6 - 15 years',
  experience_type: 'communal',
  is_chargeable: true,
  image_url: '/api/packages/package-1/image',
  inclusions: ['Beverages', 'Astro portrait'],
};

test('landing package uses database inclusions instead of child age range or static content', () => {
  const result = packageToExperience(databasePackage, [staticExperience]);

  assert.equal(result.includes, 'Beverages, Astro portrait');
  assert.equal(result.description, 'Database description');
  assert.equal(result.schedule, 'Daily | 20:30 - 21:30');
});

test('landing uses an explicit fallback when an old package has no schedule', () => {
  const result = packageToExperience({ ...databasePackage, schedule: null }, [staticExperience]);

  assert.equal(result.schedule, 'Upon request');
});

test('landing does not resurrect static packages when every database package is disabled', () => {
  assert.deepEqual(buildLandingExperiences([], [staticExperience]), []);
});

test('landing maps only packages supplied by the database', () => {
  const result = buildLandingExperiences([databasePackage], [staticExperience]);

  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'Beach Stargazing');
});
