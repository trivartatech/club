require('dotenv').config();

// Fail fast if the JWT secret is missing or left at the insecure default.
const INSECURE_SECRETS = [
  undefined,
  '',
  'chitradurga_city_club_super_secret_key_change_this_in_production_2024',
];
if (INSECURE_SECRETS.includes(process.env.JWT_SECRET)) {
  console.error(
    'FATAL: JWT_SECRET is unset or still the default placeholder. ' +
    'Set a strong, unique JWT_SECRET in server/.env before starting.'
  );
  process.exit(1);
}

const { initDb } = require('./src/config/database');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

initDb();

app.listen(PORT, () => {
  console.log(`City Club API running on http://localhost:${PORT}`);
});
