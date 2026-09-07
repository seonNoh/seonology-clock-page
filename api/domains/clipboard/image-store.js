const crypto = require('node:crypto');
const path = require('node:path');
const { mkdir, open, rename, unlink } = require('node:fs/promises');

const { createAtomicJsonStore } = require('../../infrastructure/storage/atomic-json-store');
const { sniffImageType } = require('./image-sniff');

const ID_PATTERN = /^[a-f0-9]{24}$/;

function failure(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requirePositive(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive integer`);
  return value;
}

function createClipboardImageStore({ directory, indexFile, maxImageBytes, maxTotalBytes, maxItems }) {
  if (!directory) throw new TypeError('directory is required');
  if (!indexFile) throw new TypeError('indexFile is required');
  requirePositive(maxImageBytes, 'maxImageBytes');
  requirePositive(maxTotalBytes, 'maxTotalBytes');
  requirePositive(maxItems, 'maxItems');

  const resolvedDirectory = path.resolve(directory);
  const index = createAtomicJsonStore({
    filePath: indexFile,
    defaultValue: { images: [] },
    validate: value => Boolean(value) && Array.isArray(value.images),
  });

  // Only ids the store generated ever reach the filesystem.
  function filePathFor(image) {
    return path.join(resolvedDirectory, `${image.id}.${image.extension}`);
  }

  async function ensureDirectory() {
    try {
      await mkdir(resolvedDirectory, { recursive: true, mode: 0o700 });
    } catch (error) {
      if (error.code === 'EEXIST') return;
      await mkdir(resolvedDirectory, { recursive: true });
    }
  }

  async function writeAtomically(targetPath, buffer) {
    const temporaryPath = `${targetPath}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    let handle;
    try {
      handle = await open(temporaryPath, 'wx', 0o600);
      await handle.writeFile(buffer);
      await handle.sync();
      await handle.close();
      handle = null;
      await rename(temporaryPath, targetPath);
    } catch (error) {
      if (handle) await handle.close().catch(() => {});
      await unlink(temporaryPath).catch(() => {});
      throw error;
    }
  }

  async function removeFile(filePath) {
    try {
      await unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  function totalBytesOf(images) {
    return images.reduce((sum, item) => sum + item.bytes, 0);
  }

  async function add(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw failure('Empty image body', 400);
    if (buffer.length > maxImageBytes) throw failure('Image is too large', 413);
    const sniffed = sniffImageType(buffer);
    if (!sniffed) throw failure('Unsupported image type', 400);

    const image = {
      id: crypto.randomBytes(12).toString('hex'),
      type: sniffed.type,
      extension: sniffed.extension,
      bytes: buffer.length,
      createdAt: new Date().toISOString(),
    };
    await ensureDirectory();
    await writeAtomically(filePathFor(image), buffer);

    let evicted = [];
    try {
      await index.update(value => {
        evicted = [];
        const images = [image, ...value.images.filter(item => item.id !== image.id)];
        let totalBytes = totalBytesOf(images);
        // Drop oldest entries first; the just stored image always survives.
        while (images.length > 1 && (images.length > maxItems || totalBytes > maxTotalBytes)) {
          const oldest = images.pop();
          totalBytes -= oldest.bytes;
          evicted.push(oldest);
        }
        return { images };
      });
    } catch (error) {
      await removeFile(filePathFor(image)).catch(() => {});
      throw error;
    }

    for (const item of evicted) await removeFile(filePathFor(item));
    return { image, evicted: evicted.map(item => item.id) };
  }

  async function list() {
    const value = await index.read();
    return { images: value.images, totalBytes: totalBytesOf(value.images) };
  }

  async function get(id) {
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) return null;
    const value = await index.read();
    const image = value.images.find(item => item.id === id);
    if (!image) return null;
    return { image, filePath: filePathFor(image) };
  }

  async function remove(id) {
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) return false;
    let removed = null;
    await index.update(value => {
      removed = value.images.find(item => item.id === id) || null;
      if (!removed) return value;
      return { images: value.images.filter(item => item.id !== id) };
    });
    if (!removed) return false;
    await removeFile(filePathFor(removed));
    return true;
  }

  return {
    directory: resolvedDirectory,
    limits: { maxImageBytes, maxTotalBytes, maxItems },
    add,
    list,
    get,
    remove,
  };
}

module.exports = { createClipboardImageStore };
