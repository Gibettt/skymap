import assert from 'node:assert/strict';
import test from 'node:test';
import { publicResortProfileSchema, updateResortSchema } from '../validators/resort.js';

test('resort timezone must be a valid IANA timezone', () => {
  assert.equal(updateResortSchema.safeParse({ timezone: 'Indian/Maldives' }).success, true);
  assert.equal(updateResortSchema.safeParse({ timezone: 'Maldives/Invalid' }).success, false);
});

test('public resort profile accepts landing content and normalizes an empty email', () => {
  const result = publicResortProfileSchema.safeParse({
    location: 'Thilamaafushi, Maldives',
    publicDescription: 'A private island observatory beneath Bortle 1 skies.',
    contactEmail: '',
    whatsappNumber: '9600000100',
  });
  assert.equal(result.success, true);
  assert.equal(result.data.contactEmail, null);
});

test('public resort profile rejects invalid contact data and oversized copy', () => {
  assert.equal(publicResortProfileSchema.safeParse({
    location: 'Maldives',
    publicDescription: 'x'.repeat(601),
    contactEmail: 'not-an-email',
    whatsappNumber: '',
  }).success, false);
});
