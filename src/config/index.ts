import 'dotenv/config';

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) throw new Error(`Env var ${key} must be a valid integer, got "${val}"`);
  return parsed;
}

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Required env var ${key} is not set`);
  return val;
}

const isProduction = process.env.NODE_ENV === 'production';

// Single source of truth for all env-var access.
// Add new vars here; never read process.env directly elsewhere.
export const config = {
  env: optional('NODE_ENV', 'development'),
  port: optionalInt('PORT', 3000),
  isProduction,
  isDevelopment: !isProduction,

  adminDb: {
    host: optional('ADMIN_DB_HOST', 'localhost'),
    port: optionalInt('ADMIN_DB_PORT', 5432),
    username: optional('ADMIN_DB_USER', 'postgres'),
    password: optional('ADMIN_DB_PASSWORD', 'postgres'),
    database: optional('ADMIN_DB_NAME', 'pip_admin'),
  },

  jwt: {
    secret: isProduction ? required('JWT_SECRET') : optional('JWT_SECRET', 'dev_secret_not_for_production'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },
} as const;
