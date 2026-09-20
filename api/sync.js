// Placeholder for the original sync endpoint. The deployed function answered every
// request with 503 storage-not-configured, so this keeps that behaviour byte-for-byte
// until a real store (Vercel KV / Blob) is wired up.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(503).json({ error: 'storage-not-configured' });
};
