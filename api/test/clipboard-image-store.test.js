const assert = require('node:assert/strict');
const { mkdtemp, readFile, readdir, stat } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createClipboardImageStore } = require('../domains/clipboard/image-store');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const GIF = Buffer.from('GIF89a fixture payload', 'latin1');

function pngOfSize(bytes) {
  assert.ok(bytes >= PNG.length, 'fixture size must fit the PNG header');
  return Buffer.concat([PNG, Buffer.alloc(bytes - PNG.length, 0x41)]);
}

async function fixture(overrides = {}) {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'clock-clipboard-store-'));
  const settings = {
    directory: path.join(dataDirectory, 'clipboard'),
    indexFile: path.join(dataDirectory, 'clipboard-images.json'),
    maxImageBytes: 1024 * 1024,
    maxTotalBytes: 4 * 1024 * 1024,
    maxItems: 100,
    ...overrides,
  };
  return { dataDirectory, settings, store: createClipboardImageStore(settings) };
}

test('add, list, get and remove complete a round trip on disk', async () => {
  const { settings, store } = await fixture();

  const added = await store.add(PNG);
  assert.match(added.image.id, /^[a-f0-9]{24}$/);
  assert.equal(added.image.type, 'image/png');
  assert.equal(added.image.extension, 'png');
  assert.equal(added.image.bytes, PNG.length);
  assert.ok(Number.isFinite(Date.parse(added.image.createdAt)));
  assert.deepEqual(added.evicted, []);

  const listed = await store.list();
  assert.deepEqual(listed.images, [added.image]);
  assert.equal(listed.totalBytes, PNG.length);

  const found = await store.get(added.image.id);
  assert.equal(found.filePath, path.join(settings.directory, `${added.image.id}.png`));
  assert.deepEqual(found.image, added.image);
  assert.deepEqual(await readFile(found.filePath), PNG);

  assert.equal(await store.remove(added.image.id), true);
  assert.equal(await store.get(added.image.id), null);
  assert.deepEqual(await store.list(), { images: [], totalBytes: 0 });
  assert.deepEqual(await readdir(settings.directory), []);
  assert.equal(await store.remove(added.image.id), false);
});

test('stored files are owner readable only and leave no temporary files behind', async () => {
  const { settings, store } = await fixture();

  const { image } = await store.add(PNG);

  const fileStat = await stat(path.join(settings.directory, `${image.id}.png`));
  assert.equal(fileStat.mode & 0o777, 0o600);
  assert.deepEqual(await readdir(settings.directory), [`${image.id}.png`]);
});

test('the index keeps the newest image first and tracks the stored type per entry', async () => {
  const { store } = await fixture();

  const first = await store.add(PNG);
  const second = await store.add(GIF);

  const { images, totalBytes } = await store.list();
  assert.deepEqual(images.map(image => image.id), [second.image.id, first.image.id]);
  assert.deepEqual(images.map(image => image.type), ['image/gif', 'image/png']);
  assert.equal(totalBytes, PNG.length + GIF.length);
});

test('maxItems evicts the oldest entries and deletes their files', async () => {
  const { settings, store } = await fixture({ maxItems: 2 });

  const first = await store.add(pngOfSize(120));
  const second = await store.add(pngOfSize(130));
  const third = await store.add(pngOfSize(140));

  assert.deepEqual(third.evicted, [first.image.id]);
  const { images } = await store.list();
  assert.deepEqual(images.map(image => image.id), [third.image.id, second.image.id]);
  assert.equal(await store.get(first.image.id), null);
  assert.deepEqual(
    (await readdir(settings.directory)).sort(),
    [`${second.image.id}.png`, `${third.image.id}.png`].sort(),
  );
});

test('maxTotalBytes evicts the oldest entries until the budget fits', async () => {
  const { settings, store } = await fixture({ maxTotalBytes: 400 });

  const first = await store.add(pngOfSize(150));
  const second = await store.add(pngOfSize(150));
  const third = await store.add(pngOfSize(150));

  assert.deepEqual(third.evicted, [first.image.id]);
  const { images, totalBytes } = await store.list();
  assert.deepEqual(images.map(image => image.id), [third.image.id, second.image.id]);
  assert.equal(totalBytes, 300);
  assert.deepEqual(
    (await readdir(settings.directory)).sort(),
    [`${second.image.id}.png`, `${third.image.id}.png`].sort(),
  );
});

test('rejected bodies carry the HTTP status the route reports', async () => {
  const { settings, store } = await fixture({ maxImageBytes: 256 });

  await assert.rejects(store.add(pngOfSize(257)), error => {
    assert.equal(error.statusCode, 413);
    assert.equal(error.message, 'Image is too large');
    return true;
  });
  await assert.rejects(store.add(Buffer.from('plain clipboard text', 'utf8')), error => {
    assert.equal(error.statusCode, 400);
    assert.equal(error.message, 'Unsupported image type');
    return true;
  });
  await assert.rejects(store.add(Buffer.alloc(0)), error => {
    assert.equal(error.statusCode, 400);
    assert.equal(error.message, 'Empty image body');
    return true;
  });
  await assert.rejects(store.add('not a buffer'), error => {
    assert.equal(error.statusCode, 400);
    return true;
  });
  await assert.rejects(readdir(settings.directory), /ENOENT/);
});

test('ids outside the generated format never reach the filesystem', async () => {
  const { store } = await fixture();
  await store.add(PNG);

  for (const id of ['../../etc/passwd', 'ABCDEF012345678901234567', 'short', '', null, undefined]) {
    assert.equal(await store.get(id), null);
    assert.equal(await store.remove(id), false);
  }
});

test('concurrent adds keep every entry in the index', async () => {
  const { store } = await fixture();

  const results = await Promise.all(Array.from({ length: 8 }, (_value, offset) => store.add(pngOfSize(120 + offset))));

  const { images } = await store.list();
  assert.equal(images.length, 8);
  assert.deepEqual(
    images.map(image => image.id).sort(),
    results.map(result => result.image.id).sort(),
  );
});
