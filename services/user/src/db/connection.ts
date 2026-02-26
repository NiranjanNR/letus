import { Pool } from 'pg';
import { config } from '../config';

// Pool is a singleton — one pool shared across all route handlers.
// First-principles: each PG connection is ~5MB RAM on the server side.
// max:20 keeps us well under the 100-connection Postgres default,
// even with multiple service replicas running simultaneously.
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.db.max,
  idleTimeoutMillis: config.db.idleTimeoutMs,
  connectionTimeoutMillis: config.db.connectionTimeoutMs,
});

// Log the error but DO NOT exit — transient network blips happen.
// The pool reconnects automatically. If DB stays down, /health returns 503
// and your monitoring fires. Crashing the process loses all in-flight requests.
pool.on('error', (err) => {
  console.error('[db] Postgres client error (pool will reconnect):', err.message);
});

// Verify DB is reachable at startup — fail fast before HTTP server binds.
// Prevents the server from accepting requests it can never fulfill.
export async function verifyDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[db] Connected to Postgres ✓');
  } finally {
    client.release();
  }
}

// Called during graceful shutdown — drains connections cleanly.
export async function closeDatabasePool(): Promise<void> {
  await pool.end();
  console.log('[db] Pool drained and closed');
}
