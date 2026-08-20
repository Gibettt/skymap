import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const appDirectory = fileURLToPath(new URL('../src/app/', import.meta.url));
const layoutPath = fileURLToPath(new URL('../src/app/layout.js', import.meta.url));
const fontFiles = [
  'fonts/inter-latin-variable.woff2',
  'fonts/space-grotesk-latin-variable.woff2',
];

test('landing layout uses locally hosted fonts', async () => {
  const layout = await readFile(layoutPath, 'utf8');

  assert.match(layout, /from ['"]next\/font\/local['"]/);
  assert.doesNotMatch(layout, /next\/font\/google/);
});

for (const fontFile of fontFiles) {
  test(`${fontFile} exists and is not empty`, async () => {
    const fontUrl = new URL(fontFile, new URL(`file:///${appDirectory.replaceAll('\\', '/')}/`));
    const fontPath = fileURLToPath(fontUrl);

    await access(fontPath);
    assert.ok((await stat(fontPath)).size > 0);
  });
}
