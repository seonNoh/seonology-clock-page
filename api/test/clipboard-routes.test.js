const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtemp, readdir } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createApp } = require('../app');
const { loadConfig } = require('../config');
const { createClipboardImageStore } = require('../domains/clipboard/image-store');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function pngOfSize(bytes) {
  return Buffer.concat([PNG, Buffer.alloc(bytes - PNG.length, 0x41)]);
}

async function listen(env = {}) {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'clock-clipboard-routes-'));
  const config = loadConfig({ BOOKMARKS_DIR: dataDirectory, ...env });
  const clipboardStore = createClipboardImageStore(config.clipboard);
  const server = createApp({ config, clipboardStore }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    config,
    store: clipboardStore,
    origin: `http://127.0.0.1:${server.address().port}`,
    async close() {
      server.close();
      await once(server, 'close');
    },
  };
}

function upload(origin, body, contentType = 'image/png') {
  return fetch(`${origin}/api/clipboard/images`, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });
}

test('a pasted PNG is stored and returned with the sniffed type', async t => {
  const runtime = await listen();
  t.after(() => runtime.close());

  const response = await upload(runtime.origin, PNG, 'image/webp');

  assert.equal(response.status, 201);
  const { image } = await response.json();
  assert.deepEqual(Object.keys(image).sort(), ['bytes', 'createdAt', 'extension', 'id', 'type']);
  assert.match(image.id, /^[a-f0-9]{24}$/);
  assert.equal(image.type, 'image/png', 'the client Content-Type must not decide the stored type');
  assert.equal(image.extension, 'png');
  assert.equal(image.bytes, PNG.length);
  assert.deepEqual(await readdir(runtime.config.clipboard.directory), [`${image.id}.png`]);
});

test('a non-image body is refused with a JSON error', async t => {
  const runtime = await listen();
  t.after(() => runtime.close());

  const response = await upload(runtime.origin, Buffer.from('clipboard text', 'utf8'), 'text/plain');

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Content-Type must be image/*' });
  assert.deepEqual(await runtime.store.list(), { images: [], totalBytes: 0 });
});

test('an image media type carrying something else is refused by the magic bytes check', async t => {
  const runtime = await listen();
  t.after(() => runtime.close());

  const response = await upload(runtime.origin, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8'), 'image/svg+xml');

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Unsupported image type' });
});

test('a body over the configured limit is refused with a 413 JSON error', async t => {
  const runtime = await listen({ CLIPBOARD_MAX_IMAGE_BYTES: '256' });
  t.after(() => runtime.close());

  const response = await upload(runtime.origin, pngOfSize(4096));

  assert.equal(response.status, 413);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.deepEqual(await response.json(), { error: 'Image is too large' });
  assert.deepEqual(await runtime.store.list(), { images: [], totalBytes: 0 });
});

test('the listing returns newest first with the total size and the active limits', async t => {
  const runtime = await listen();
  t.after(() => runtime.close());
  const first = (await (await upload(runtime.origin, pngOfSize(120))).json()).image;
  const second = (await (await upload(runtime.origin, pngOfSize(130))).json()).image;

  const response = await fetch(`${runtime.origin}/api/clipboard/images`);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.images.map(image => image.id), [second.id, first.id]);
  assert.equal(body.totalBytes, 250);
  assert.deepEqual(body.limits, {
    maxImageBytes: 25 * 1024 * 1024,
    maxTotalBytes: 256 * 1024 * 1024,
    maxItems: 100,
  });
});

test('the file response carries the caching and sniffing headers of a stored image', async t => {
  const runtime = await listen();
  t.after(() => runtime.close());
  const { image } = await (await upload(runtime.origin, PNG)).json();

  const response = await fetch(`${runtime.origin}/api/clipboard/images/${image.id}`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('content-length'), String(PNG.length));
  assert.equal(response.headers.get('cache-control'), 'private, max-age=31536000, immutable');
  assert.equal(response.headers.get('content-disposition'), `inline; filename="clip-${image.id}.png"`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
});

test('ids outside the generated format are not found', async t => {
  const runtime = await listen();
  t.after(() => runtime.close());

  for (const id of ['..%2f..%2fetc%2fpasswd', 'ABCDEF012345678901234567', 'short', 'a'.repeat(24)]) {
    const response = await fetch(`${runtime.origin}/api/clipboard/images/${id}`);
    assert.equal(response.status, 404, id);
    assert.deepEqual(await response.json(), { error: 'Image not found' });
  }
});

test('deleting an image removes the file and the following read is not found', async t => {
  const runtime = await listen();
  t.after(() => runtime.close());
  const { image } = await (await upload(runtime.origin, PNG)).json();

  const deleted = await fetch(`${runtime.origin}/api/clipboard/images/${image.id}`, { method: 'DELETE' });

  assert.equal(deleted.status, 204);
  assert.equal((await deleted.text()).length, 0);
  assert.deepEqual(await readdir(runtime.config.clipboard.directory), []);
  assert.equal((await fetch(`${runtime.origin}/api/clipboard/images/${image.id}`)).status, 404);
  assert.equal((await fetch(`${runtime.origin}/api/clipboard/images/${image.id}`, { method: 'DELETE' })).status, 404);
});

test('uploads past maxItems evict the oldest image and its file', async t => {
  const runtime = await listen({ CLIPBOARD_MAX_ITEMS: '2' });
  t.after(() => runtime.close());

  const first = (await (await upload(runtime.origin, pngOfSize(120))).json()).image;
  const second = (await (await upload(runtime.origin, pngOfSize(130))).json()).image;
  const third = (await (await upload(runtime.origin, pngOfSize(140))).json()).image;

  const body = await (await fetch(`${runtime.origin}/api/clipboard/images`)).json();
  assert.deepEqual(body.images.map(image => image.id), [third.id, second.id]);
  assert.equal(body.limits.maxItems, 2);
  assert.equal((await fetch(`${runtime.origin}/api/clipboard/images/${first.id}`)).status, 404);
  assert.deepEqual(
    (await readdir(runtime.config.clipboard.directory)).sort(),
    [`${second.id}.png`, `${third.id}.png`].sort(),
  );
});

test('uploads past maxTotalBytes evict the oldest images and their files', async t => {
  const runtime = await listen({ CLIPBOARD_MAX_TOTAL_BYTES: '400' });
  t.after(() => runtime.close());

  const first = (await (await upload(runtime.origin, pngOfSize(150))).json()).image;
  const second = (await (await upload(runtime.origin, pngOfSize(150))).json()).image;
  const third = (await (await upload(runtime.origin, pngOfSize(150))).json()).image;

  const body = await (await fetch(`${runtime.origin}/api/clipboard/images`)).json();
  assert.deepEqual(body.images.map(image => image.id), [third.id, second.id]);
  assert.equal(body.totalBytes, 300);
  assert.equal((await fetch(`${runtime.origin}/api/clipboard/images/${first.id}`)).status, 404);
  assert.deepEqual(
    (await readdir(runtime.config.clipboard.directory)).sort(),
    [`${second.id}.png`, `${third.id}.png`].sort(),
  );
});
