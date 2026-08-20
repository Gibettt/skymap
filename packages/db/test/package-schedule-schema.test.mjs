import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const schemaPath = fileURLToPath(new URL('../../../db/schema.sql', import.meta.url));
const migrationPath = fileURLToPath(new URL('../../../db/migrations/017_package_schedule.sql', import.meta.url));

test('package schema and migration persist a validated schedule value', async () => {
  const [schema, migration] = await Promise.all([
    readFile(schemaPath, 'utf8'),
    readFile(migrationPath, 'utf8'),
  ]);

  assert.match(schema, /schedule text NOT NULL DEFAULT 'Upon request'/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS schedule text/);
  assert.match(migration, /packages_schedule_length_check/);
});
