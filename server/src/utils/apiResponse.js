const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, data, message });

const created = (res, data, message = 'Created') =>
  res.status(201).json({ success: true, data, message });

const paginated = (res, data, pagination, message = 'Success') =>
  res.status(200).json({ success: true, data, message, pagination });

const error = (res, message, status = 400, code = 'ERROR') =>
  res.status(status).json({ success: false, error: code, message });

module.exports = { ok, created, paginated, error };
