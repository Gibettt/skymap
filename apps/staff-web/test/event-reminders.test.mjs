import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('the reminder cron is off without CRON_SECRET and checks the bearer token in constant time', async () => {
  const route = await read('../src/app/api/cron/event-reminders/route.js');
  assert.match(route, /status: 503/);
  assert.match(route, /status: 401/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /header\.length === expected\.length/);
  assert.match(route, /sendDueEventReminders\(client/);
  assert.match(route, /ensureEventNotificationSchema\(\)/);
});

test('the scheduler reaches the cron route without a staff session', async () => {
  const proxy = await read('../src/proxy.ts');
  assert.match(proxy, /\/api\/\(\(\?!auth\/\|cron\/\)\.\+\)/);
});

test('creating and updating events notifies the resort staff', async () => {
  const [create, update, types, center] = await Promise.all([
    read('../src/app/api/sky-events/route.js'),
    read('../src/app/api/sky-events/[id]/route.js'),
    read('../src/types/notifications.ts'),
    read('../src/app/(main)/dashboard/_components/header/notification-center.tsx'),
  ]);
  assert.match(create, /emit\(\s*EventTypes\.SKY_EVENT_CREATED/);
  assert.match(update, /emit\(EventTypes\.SKY_EVENT_UPDATED/);
  assert.match(update, /previousStatus: before\.rows\[0\]\.status/);
  for (const source of [create, update]) assert.match(source, /ensureEventNotificationSchema\(\)/);
  assert.match(types, /"event"/);
  assert.match(center, /type === "event"/);
});
