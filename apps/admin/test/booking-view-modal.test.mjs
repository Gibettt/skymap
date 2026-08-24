import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const globalsCss = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

test('booking view header follows the dark product theme', () => {
  assert.match(globalsCss, /\.family-view-hero\s*\{[^}]*background:\s*var\(--bg-card\);/s);
  assert.match(globalsCss, /\.family-view-hero h2\s*\{[^}]*color:\s*var\(--text-primary\);/s);
  assert.match(globalsCss, /\.family-view-hero p\s*\{[^}]*color:\s*var\(--text-secondary\);/s);
});
