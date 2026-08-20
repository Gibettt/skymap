import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const contextPath = fileURLToPath(new URL('../src/context/AdminLanguageContext.jsx', import.meta.url));

test('admin language dictionary covers recently added package, resort, booking, and sky-event UI', async () => {
  const source = await readFile(contextPath, 'utf8');
  const requiredLiterals = [
    'Kembali ke daftar package',
    'Kolom bertanda wajib harus diisi',
    'Kelola nama package, harga, status aktif, dan estimasi umur anak.',
    'Nama Resort Mitra *',
    'Status Operasional',
    'Semua Kategori',
    'Deskripsi Edukasi & Pengamatan',
    'Tanggal baru (YYYY-MM-DD)',
    'Alasan reschedule',
    'Gagal memuat audit log.',
  ];

  for (const literal of requiredLiterals) assert.ok(source.includes(literal), `Missing admin translation for: ${literal}`);
});

test('admin legacy translator also translates select options', async () => {
  const source = await readFile(contextPath, 'utf8');

  assert.doesNotMatch(source, /\['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION'\]/);
  assert.match(source, /\[placeholder\],\[title\],\[aria-label\],\[data-label\]/);
  assert.match(source, /language === 'id'/);
  assert.match(source, /booking records/);
});
