export function ok(res, data) {
  res.json({ ok: true, data });
}

export function fail(res, status, message, details) {
  res.status(status).json({ ok: false, message, details });
}

