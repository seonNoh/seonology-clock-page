// Clients may send any Content-Type, so the stored type comes from magic bytes only.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const GIF87A = Buffer.from('GIF87a', 'latin1');
const GIF89A = Buffer.from('GIF89a', 'latin1');
const RIFF = Buffer.from('RIFF', 'latin1');
const WEBP = Buffer.from('WEBP', 'latin1');

function matches(buffer, signature, offset = 0) {
  const end = offset + signature.length;
  return buffer.length >= end && buffer.subarray(offset, end).equals(signature);
}

function sniffImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  if (matches(buffer, PNG)) return { type: 'image/png', extension: 'png' };
  if (matches(buffer, JPEG)) return { type: 'image/jpeg', extension: 'jpg' };
  if (matches(buffer, GIF87A) || matches(buffer, GIF89A)) return { type: 'image/gif', extension: 'gif' };
  // WebP keeps the RIFF container header, so both markers must line up.
  if (matches(buffer, RIFF) && matches(buffer, WEBP, 8)) return { type: 'image/webp', extension: 'webp' };
  return null;
}

module.exports = { sniffImageType };
