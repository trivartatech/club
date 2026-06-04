require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();

// Security — allow blob:/data: images (photo cropper), inline styles, and Google Fonts.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'blob:'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'script-src': ["'self'"],
      'connect-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_ORIGIN || true
    : true,
  credentials: true,
}));

// Rate limit login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'RATE_LIMITED', message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos (path anchored to the server folder, not the cwd)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/fee-config', require('./routes/feeConfig'));
app.use('/api/member-number-config', require('./routes/memberNumberConfig'));
app.use('/api/users', require('./routes/users'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// In production, serve the React build
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (_req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'FILE_TOO_LARGE', message: 'File must be under 5MB' });
  }
  // Multer / known validation errors carry a safe, user-facing message.
  if (err instanceof require('multer').MulterError || err.expose) {
    return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: err.message });
  }
  // Don't leak internal error details to the client.
  res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Internal server error' });
});

module.exports = app;
