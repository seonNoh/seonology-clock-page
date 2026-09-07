const assert = require('node:assert/strict');
const test = require('node:test');

const { sniffImageType } = require('../domains/clipboard/image-sniff');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function webp(marker = 'WEBP') {
  return Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    Buffer.from([0x1a, 0x00, 0x00, 0x00]),
    Buffer.from(marker, 'latin1'),
    Buffer.from('VP8 fixture', 'latin1'),
  ]);
}

test('the four supported formats are recognised from their magic bytes', () => {
  assert.deepEqual(sniffImageType(PNG), { type: 'image/png', extension: 'png' });
  assert.deepEqual(
    sniffImageType(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('JFIF', 'latin1')])),
    { type: 'image/jpeg', extension: 'jpg' },
  );
  assert.deepEqual(sniffImageType(Buffer.from('GIF87a fixture', 'latin1')), { type: 'image/gif', extension: 'gif' });
  assert.deepEqual(sniffImageType(Buffer.from('GIF89a fixture', 'latin1')), { type: 'image/gif', extension: 'gif' });
  assert.deepEqual(sniffImageType(webp()), { type: 'image/webp', extension: 'webp' });
});

test('truncated headers are not accepted as images', () => {
  assert.equal(sniffImageType(PNG.subarray(0, 7)), null);
  assert.equal(sniffImageType(Buffer.from([0xff, 0xd8])), null);
  assert.equal(sniffImageType(Buffer.from('GIF8', 'latin1')), null);
  assert.equal(sniffImageType(webp().subarray(0, 11)), null);
});

test('other RIFF containers, text and empty buffers return null', () => {
  assert.equal(sniffImageType(webp('WAVE')), null);
  assert.equal(sniffImageType(Buffer.from('plain clipboard text', 'utf8')), null);
  assert.equal(sniffImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8')), null);
  assert.equal(sniffImageType(Buffer.alloc(0)), null);
});

test('non-buffer input returns null instead of throwing', () => {
  assert.equal(sniffImageType(undefined), null);
  assert.equal(sniffImageType(null), null);
  assert.equal(sniffImageType('iVBORw0KGgo='), null);
  assert.equal(sniffImageType(new Uint8Array([0x89, 0x50])), null);
});
