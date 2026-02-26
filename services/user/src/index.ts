// services/user/src/index.ts
//
// Boot sequence order matters:
// 1. Load + validate config (crashes if secrets missing)
// 2. Connect to DB (crashes if unreachable)
// 3. Bind HTTP server
// 4. Register graceful shutdown handlers
//
// This order means: if anything is misconfigured, the process
// exits before accepting a single request. No silent half-up state.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import authRouter from './routes/auth';
import { pool, verifyDatabaseConnection, closeDatabasePool } from './db/connection';

const app = express();

// ---- Security middleware ----

// CORS: explicitly allow only known origins.
// '*' means any website can call your API impersonating your app.
app.use(cors({
  origin: config.allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body size limit: prevents memory exhaustion via huge JSON payloads.
// 10kb is generous for auth routes — no endpoint needs more.
app.use(express.json({ limit: '10kb' }));

// ---- Routes ----
app.use('/auth', authRouter);

// ---- Health check ----
// Kubernetes/ALB/uptime monitors hit this. Must return 200 only when
// the service is actually ready to handle requests.
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'user',
      db: 'connected',
      uptime: process.uptime(),
    });
  } catch {
    // Return 503 so load balancers stop routing to this instance
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ---- Boot ----
async function start() {
  // Config validation already ran at import time (see config/index.ts).
  // DB must be reachable before we accept traffic.
  await verifyDatabaseConnection();

  const server = app.listen(config.port, () => {
    console.log(`\n✅ User Service running on http://localhost:${config.port}`);
    console.log(`   ENV: ${config.nodeEnv}`);
    console.log(`   Endpoints: /auth/register | /auth/login | /auth/refresh | /auth/logout | /auth/me`);
  });

  // ---- Graceful shutdown ----
  // Without this, a deploy SIGTERM kills the process mid-request.
  // With it: stop accepting new connections, finish in-flight requests,
  // drain the DB pool, then exit cleanly.
  const shutdown = async (signal: string) => {
    console.log(`\n[shutdown] ${signal} received — draining connections...`);

    server.close(async () => {
      await closeDatabasePool();
      console.log('[shutdown] Clean exit');
      process.exit(0);
    });

    // Force exit if drain takes longer than 10s (stuck requests)
    setTimeout(() => {
      console.error('[shutdown] Timeout — forcing exit');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM')); // Docker/EC2 deploy signal
  process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl+C in dev
}

start().catch((err) => {
  console.error('[boot] Fatal startup error:', err);
  process.exit(1);
});

export default app;
