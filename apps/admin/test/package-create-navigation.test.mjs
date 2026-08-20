import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const packageListPath = fileURLToPath(new URL('../src/app/dashboard/admin/packages/page.js', import.meta.url));
const packageCreatePath = fileURLToPath(new URL('../src/app/dashboard/admin/packages/new/page.js', import.meta.url));
const packageEditPath = fileURLToPath(new URL('../src/app/dashboard/admin/packages/[id]/edit/page.js', import.meta.url));
const adminHeaderPath = fileURLToPath(new URL('../src/components/AdminHeader.jsx', import.meta.url));

test('Tambah Package navigates to a dedicated page instead of opening the inline form', async () => {
  const source = await readFile(packageListPath, 'utf8');

  assert.match(source, /href=["']\/dashboard\/admin\/packages\/new["']/);
  assert.doesNotMatch(source, /useCreatePackageMutation/);
});

test('dedicated create page keeps the existing package create mutation and returns to the list', async () => {
  const source = await readFile(packageCreatePath, 'utf8');

  assert.match(source, /useCreatePackageMutation/);
  assert.match(source, /router\.push\(["']\/dashboard\/admin\/packages["']\)/);
  assert.match(source, /Including/);
  assert.match(source, /Gambar Package/);
});

test('admin header identifies the dedicated package create route', async () => {
  const source = await readFile(adminHeaderPath, 'utf8');

  assert.match(source, /\/dashboard\/admin\/packages\/new/);
  assert.match(source, /Tambah Package/);
});

test('Edit Package navigates to a dedicated dynamic page instead of opening an inline form', async () => {
  const source = await readFile(packageListPath, 'utf8');

  assert.match(source, /packages\/\$\{pkg\.id\}\/edit/);
  assert.doesNotMatch(source, /useUpdatePackageMutation/);
  assert.doesNotMatch(source, /AttachmentUpload/);
  assert.doesNotMatch(source, /showForm/);
});

test('dedicated edit page keeps the existing package update mutation and returns to the list', async () => {
  const source = await readFile(packageEditPath, 'utf8');

  assert.match(source, /useParams/);
  assert.match(source, /usePackagesQuery/);
  assert.match(source, /useUpdatePackageMutation/);
  assert.match(source, /router\.push\(["']\/dashboard\/admin\/packages["']\)/);
  assert.match(source, /Including/);
  assert.match(source, /Gambar Package/);
});

test('admin header identifies the dedicated package edit route', async () => {
  const source = await readFile(adminHeaderPath, 'utf8');

  assert.match(source, /pathname\.endsWith\(["']\/edit["']\)/);
  assert.match(source, /Edit Package/);
});

test('create and edit forms expose Schedule and keep it in package form data', async () => {
  const [createSource, editSource] = await Promise.all([
    readFile(packageCreatePath, 'utf8'),
    readFile(packageEditPath, 'utf8'),
  ]);

  assert.match(createSource, /schedule:\s*['"]Upon request['"]/);
  assert.match(createSource, /label=['"]Schedule['"]/);
  assert.match(editSource, /schedule:\s*pkg\.schedule/);
  assert.match(editSource, /label=['"]Schedule['"]/);
});
