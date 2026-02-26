// services/user/src/config/index.ts
//
// First-principles rule: if a required secret is missing, crash loudly at boot.
// Silent undefined propagation (jwt.sign with undefined secret) is a production
// security hole that shows up only when a real user tries to log in.

function required(key: string): string {
  const val = process.env[key];
  if (!val || val.trim() === '') {
    // Crash immediately with a clear message. Do not let the server start.
    console.error(`\n[FATAL] Missing required environment variable: ${key}`);
    console.error(`        Copy .env.example to .env and fill in all values.\n`);
    process.exit(1);
  }
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  refreshSecret: required('REFRESH_SECRET'),

  // Pool tuning: keeps connections well under Postgres max_connections (100 default)
  // Rule: (max_connections / num_services) * 0.8 — leave headroom for admin queries
  db: {
    max: parseInt(optional('DB_POOL_MAX', '20'), 10),
    idleTimeoutMs: parseInt(optional('DB_IDLE_TIMEOUT_MS', '30000'), 10),
    connectionTimeoutMs: parseInt(optional('DB_CONNECT_TIMEOUT_MS', '5000'), 10),
  },

  // Rate limiting: login/register are the primary brute-force surfaces
  rateLimit: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: parseInt(optional('RATE_LIMIT_MAX', '20'), 10),
  },

  // CORS: in production, restrict to your actual domains
  allowedOrigins: optional('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:8081').split(','),
} as const;
