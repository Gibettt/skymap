import assert from 'node:assert/strict';
import test from 'node:test';

import { assertSameOrigin } from '../origin.js';
import { registrationKey, REGISTRATION_LIMITS } from '../registration-rate-limit.js';
import { hashPasswordAsync, verifyPassword } from '../session.js';

test('same-origin validation accepts an exact public origin', async () => {
  const request = new Request('https://staff.ephemeris.test/api/auth/login', {
    method: 'POST',
    headers: {
      host: 'staff.ephemeris.test',
      origin: 'https://staff.ephemeris.test',
    },
  });

  await assert.doesNotReject(assertSameOrigin(request, { requireOrigin: true }));
});

test('same-origin validation uses forwarded host and protocol behind a proxy', async () => {
  const request = new Request('http://staff-web:3004/api/auth/login', {
    method: 'POST',
    headers: {
      host: 'staff-web:3004',
      origin: 'https://staff.ephemeris.test',
      'x-forwarded-host': 'staff.ephemeris.test',
      'x-forwarded-proto': 'https',
    },
  });

  await assert.doesNotReject(assertSameOrigin(request, { requireOrigin: true }));
});

test('same-origin validation rejects cross-origin and missing origins in every environment', async () => {
  const crossOrigin = new Request('https://staff.ephemeris.test/api/auth/login', {
    method: 'POST',
    headers: {
      host: 'staff.ephemeris.test',
      origin: 'https://attacker.example',
    },
  });
  const missingOrigin = new Request('https://staff.ephemeris.test/api/auth/login', {
    method: 'POST',
    headers: { host: 'staff.ephemeris.test' },
  });

  await assert.rejects(assertSameOrigin(crossOrigin, { requireOrigin: true }), { status: 403 });
  await assert.rejects(assertSameOrigin(missingOrigin), { status: 403 });
});

test('asynchronous password hashing remains compatible with password verification', async () => {
  const hash = await hashPasswordAsync('correct horse battery staple');

  assert.equal(verifyPassword('correct horse battery staple', hash), true);
  assert.equal(verifyPassword('wrong password', hash), false);
});

test('registration limiter hashes identifiers and defines separate email and IP budgets', () => {
  const emailKey = registrationKey('email', 'Person@Example.com');
  const normalizedEmailKey = registrationKey('email', 'person@example.com');
  const ipKey = registrationKey('ip', '203.0.113.8');

  assert.equal(emailKey, normalizedEmailKey);
  assert.match(emailKey, /^[a-f0-9]{64}$/);
  assert.notEqual(emailKey, ipKey);
  assert.ok(REGISTRATION_LIMITS.email < REGISTRATION_LIMITS.ip);
});
