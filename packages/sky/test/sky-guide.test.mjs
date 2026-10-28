import assert from 'node:assert/strict';
import test from 'node:test';

import { moonSnapshot, skyGuide } from '../index.js';

const MALDIVES = { latitude: 5.2893, longitude: 73.5358 };

test('the moon snapshot names the phase and how much of the moon is lit', () => {
  const full = moonSnapshot(new Date('2026-03-03T11:34:00Z'));
  assert.equal(full.phaseName, 'Full Moon');
  assert.equal(full.illuminationPercent, 100);

  const fresh = moonSnapshot(new Date('2026-02-10T00:00:00Z'));
  assert.equal(fresh.nextNewMoon.slice(0, 10), '2026-02-17');
  assert.ok(fresh.illuminationPercent < 50);
});

test('the guide groups moon phases, meteor showers and other astronomy, skipping what already ended', () => {
  const guide = skyGuide({ ...MALDIVES, from: '2026-08-01', to: '2026-08-31', now: new Date('2026-08-10T00:00:00Z') });

  assert.ok(guide.moonPhases.length >= 2);
  assert.ok(guide.moonPhases.every((event) => event.id.startsWith('moon-')));
  assert.ok(guide.meteorShowers.some((event) => event.title.includes('Perseids')));
  assert.ok(guide.astronomicalEvents.some((event) => event.title.includes('Total Solar Eclipse')));
  const all = [...guide.moonPhases, ...guide.meteorShowers, ...guide.astronomicalEvents];
  assert.ok(all.every((event) => new Date(event.endsAt ?? event.startsAt) >= new Date('2026-08-10T00:00:00Z')));
  assert.equal(guide.moon.phaseName.length > 0, true);
});
