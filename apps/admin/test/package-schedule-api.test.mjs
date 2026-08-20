import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const createApiPath = fileURLToPath(new URL('../src/app/api/packages/route.js', import.meta.url));
const updateApiPath = fileURLToPath(new URL('../src/app/api/packages/[id]/route.js', import.meta.url));

test('package create and update APIs parse and persist Schedule', async () => {
  const [createSource, updateSource] = await Promise.all([
    readFile(createApiPath, 'utf8'),
    readFile(updateApiPath, 'utf8'),
  ]);

  assert.match(createSource, /schedule:\s*form\.get\(['"]schedule['"]\)/);
  assert.match(createSource, /data\.schedule/);
  assert.match(updateSource, /fields\.schedule\s*=\s*form\.get\(['"]schedule['"]\)/);
  assert.match(updateSource, /schedule:\s*body\.schedule/);
});
