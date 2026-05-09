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

// Single source of truth for all env-var access.
// Add new vars here; never read process.env directly elsewhere.
export const config = {
  env: optional('NODE_ENV', 'development'),
  port: optionalInt('PORT', 3000),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  adminDb: {
    host: optional('ADMIN_DB_HOST', 'localhost'),
    port: optionalInt('ADMIN_DB_PORT', 5432),
    username: optional('ADMIN_DB_USER', 'postgres'),
    password: optional('ADMIN_DB_PASSWORD', 'postgres'),
    database: optional('ADMIN_DB_NAME', 'pip_admin'),
  },

  jwt: {
    secret: optional('JWT_SECRET', 'change_me_in_production'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },
} as const;
