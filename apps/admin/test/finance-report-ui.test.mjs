import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const pagePath = fileURLToPath(new URL('../src/app/dashboard/admin/keuangan/page.js', import.meta.url));
const stylesPath = fileURLToPath(new URL('../src/app/globals.css', import.meta.url));

test('finance report exposes an accessible tab interface and useful recap sections', async () => {
  const source = await readFile(pagePath, 'utf8');

  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /aria-selected=/);
  assert.match(source, /Distribusi Pendapatan/);
  assert.match(source, /Rekonsiliasi Invoice/);
  assert.match(source, /Transaksi Selesai Terbaru/);
});

test('finance recap has scoped responsive styles instead of inline grid layout', async () => {
  const [source, styles] = await Promise.all([
    readFile(pagePath, 'utf8'),
    readFile(stylesPath, 'utf8'),
  ]);

  assert.match(source, /className="finance-report/);
  assert.match(styles, /\.finance-report-summary/);
  assert.match(styles, /\.finance-report-grid/);
  assert.match(styles, /@media \(max-width: 768px\)[\s\S]*\.finance-report-summary/);
  assert.doesNotMatch(source, /gridTemplateColumns:\s*'repeat\(4, 1fr\)'/);
});
