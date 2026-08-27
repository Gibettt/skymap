import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../src/app/page.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/app/product.css', import.meta.url), 'utf8');
const showcase = await readFile(new URL('../src/components/StargazingExperienceShowcase.jsx', import.meta.url), 'utf8');

test('home leads guests from inspiration to resort selection and booking', () => {
  assert.match(page, /\/stargazing-assets\/ephemeris-nasa-editorial-hero\.png/);
  assert.match(page, /id="resorts"/);
  assert.match(page, /id="experiences"/);
  assert.match(page, /id="masterclass"/);
  assert.doesNotMatch(page, /guest rating target/);
  assert.doesNotMatch(page, /hero-price-card/);
});

test('home uses a NASA-inspired editorial composition without copying NASA branding', () => {
  assert.match(page, /\/spacecat-astrotourism-logo\.jpg/);
  assert.match(page, /SpaceCat/);
  assert.match(page, /Astrotourism/);
  assert.doesNotMatch(page, /quality=\{88\}/);
  assert.match(page, /className="home-site-header"/);
  assert.match(page, /className="home-hero-action"/);
  assert.match(page, /className="home-featured-heading"/);
  assert.match(page, /className="home-image-story"/);
  assert.doesNotMatch(page, /NASA/);
  assert.match(styles, /\.home-site-header\s*\{/);
  assert.match(styles, /\.home-hero-action[,\s]/);
  assert.match(styles, /\.home-featured-heading\s*\{/);
  assert.match(styles, /@media \(max-width: 768px\)/);
});

test('experience carousel advances automatically with directional slide states', () => {
  assert.match(showcase, /window\.setInterval/);
  assert.doesNotMatch(showcase, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.doesNotMatch(showcase, /const \[isPaused/);
  assert.doesNotMatch(showcase, /onPointerEnter=.*setIsPaused/);
  assert.doesNotMatch(showcase, /onFocusCapture=.*setIsPaused/);
  assert.match(showcase, /setSlideDirection\('next'\)/);
  assert.match(showcase, /is-before/);
  assert.match(showcase, /is-after/);
  assert.match(styles, /\.experience-slide\.is-before/);
  assert.match(styles, /\.experience-slide\.is-after/);
});
