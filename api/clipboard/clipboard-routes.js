const fs = require('node:fs');
const express = require('express');

const STREAM_HEADERS = ['Content-Type', 'Content-Length', 'Cache-Control', 'Content-Disposition'];

function statusOf(error) {
  return Number.isInteger(error?.statusCode) ? error.statusCode : 500;
}

function setupClipboardRoutes(app, { store, maxImageBytes }) {
  // Only this route parses a raw body, and only for image media types.
  const parseImageBody = express.raw({ type: 'image/*', limit: maxImageBytes });

  app.get('/api/clipboard/images', async (_req, res) => {
    try {
      const { images, totalBytes } = await store.list();
      res.json({ images, totalBytes, limits: store.limits });
    } catch {
      res.status(500).json({ error: 'Failed to list clipboard images' });
    }
  });

  app.post(
    '/api/clipboard/images',
    parseImageBody,
    async (req, res) => {
      if (!Buffer.isBuffer(req.body)) {
        res.status(400).json({ error: 'Content-Type must be image/*' });
        return;
      }
      try {
        const { image } = await store.add(req.body);
        res.status(201).json({ image });
      } catch (error) {
        const status = statusOf(error);
        res.status(status).json({
          error: status === 500 ? 'Failed to store clipboard image' : error.message,
        });
      }
    },
    (error, _req, res, _next) => {
      if (error?.type === 'entity.too.large') {
        res.status(413).json({ error: 'Image is too large' });
        return;
      }
      res.status(400).json({ error: 'Invalid image upload' });
    },
  );

  app.get('/api/clipboard/images/:id', async (req, res) => {
    let found;
    try {
      found = await store.get(req.params.id);
    } catch {
      res.status(500).json({ error: 'Failed to read clipboard image' });
      return;
    }
    if (!found) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    res.setHeader('Content-Type', found.image.type);
    res.setHeader('Content-Length', String(found.image.bytes));
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', `inline; filename="clip-${found.image.id}.${found.image.extension}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(found.filePath);
    stream.once('error', error => {
      if (res.headersSent) {
        res.destroy(error);
        return;
      }
      for (const header of STREAM_HEADERS) res.removeHeader(header);
      const status = error.code === 'ENOENT' ? 404 : 500;
      res.status(status).json({
        error: status === 404 ? 'Image not found' : 'Failed to read clipboard image',
      });
    });
    res.once('close', () => stream.destroy());
    stream.pipe(res);
  });

  app.delete('/api/clipboard/images/:id', async (req, res) => {
    try {
      const removed = await store.remove(req.params.id);
      if (!removed) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }
      res.status(204).end();
    } catch {
      res.status(500).json({ error: 'Failed to delete clipboard image' });
    }
  });
}

module.exports = { setupClipboardRoutes };
