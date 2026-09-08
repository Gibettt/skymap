import assert from 'node:assert/strict';
import test from 'node:test';

import { createStaffSchema, externalRegistrationSchema } from '../validators/user.js';

const validStaff = {
  name: 'Siti Rahma',
  email: 'siti@example.com',
  phone: '+62 812 3456 7890',
  role: 'internal',
  status: 'active',
  resortId: '550e8400-e29b-41d4-a716-446655440000',
  password: 'rahasia123',
};

test('staff creation requires a resort and a valid temporary password', () => {
  assert.equal(createStaffSchema.safeParse(validStaff).success, true);
  assert.equal(createStaffSchema.safeParse({ ...validStaff, resortId: null }).success, false);
  assert.equal(createStaffSchema.safeParse({ ...validStaff, password: 'short' }).success, false);
});

test('staff creation cannot create another administrator', () => {
  assert.equal(createStaffSchema.safeParse({ ...validStaff, role: 'admin' }).success, false);
});

test('external self-registration normalizes public account fields', () => {
  const parsed = externalRegistrationSchema.safeParse({
    name: '  Dewi Lestari  ',
    email: '  DEWI@EXAMPLE.COM  ',
    phone: '',
    resortId: validStaff.resortId,
    password: validStaff.password,
  });

  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.data, {
    name: 'Dewi Lestari',
    email: 'dewi@example.com',
    phone: null,
    resortId: validStaff.resortId,
    password: validStaff.password,
  });
});

test('external self-registration cannot submit privileged account fields', () => {
  const registration = {
    name: validStaff.name,
    email: validStaff.email,
    resortId: validStaff.resortId,
    password: validStaff.password,
  };

  assert.equal(externalRegistrationSchema.safeParse({ ...registration, role: 'internal' }).success, false);
  assert.equal(externalRegistrationSchema.safeParse({ ...registration, status: 'active' }).success, false);
  assert.equal(externalRegistrationSchema.safeParse({ ...registration, accessRoleId: validStaff.resortId }).success, false);
  assert.equal(externalRegistrationSchema.safeParse({ ...registration, password: 'short' }).success, false);
});
