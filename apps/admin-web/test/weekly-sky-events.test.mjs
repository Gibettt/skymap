import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('creating an event can repeat it weekly as one series', async () => {
  const [create, lib] = await Promise.all([read('../src/app/api/sky-events/route.js'), read('../src/app/api/sky-events/_lib/sky-event.js')]);
  const source = create + lib;

  assert.match(source, /weeklyOccurrences\(/);
  assert.match(source, /repeatWeeklyUntil/);
  assert.match(create, /const seriesId = occurrences\.length > 1 \? randomUUID\(\) : null;/);
  assert.match(create, /series_id\)/);
  assert.match(create, /createdCount/);
  assert.match(create, /ensureSkyEventSeriesSchema\(\)/);
});

test('a series can be deleted from one date onwards, scoped to that series', async () => {
  const route = await read('../src/app/api/sky-events/[id]/route.js');

  assert.match(route, /searchParams\.get\('scope'\) === 'following'/);
  assert.match(route, /WHERE series_id = \$1 [^']*starts_at >= /);
  assert.match(route, /deletedCount/);
});
