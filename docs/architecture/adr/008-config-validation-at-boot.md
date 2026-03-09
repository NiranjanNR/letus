# ADR-008: Config Validation Crashes at Boot

**Status:** Accepted
**Date:** 2024-01-01
**Decider:** Human
**Phase:** 0

## Context
Node.js reads environment variables as strings at runtime. If `JWT_SECRET` is undefined,
`process.env.JWT_SECRET` is the string `"undefined"` — not an error. A server started
without required secrets will appear healthy (passing health checks) but will produce
cryptographically invalid JWTs that either fail validation or, worse, are signed with the
literal string "undefined" — a known, predictable key. This class of bug is silent in
production until a user tries to log in.

## Decision
All environment variables are read and validated once at application startup using Zod.
If any required variable is missing or invalid, the process throws synchronously before
`app.listen()` is called — ensuring a misconfigured deployment fails immediately and
visibly, rather than silently.

## Implementation Location
`services/user/src/config/index.ts`

```typescript
import { z } from 'zod';

const schema = z.object({
  JWT_SECRET: z.string().min(32),
  REFRESH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  // ...
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[config] Missing or invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1); // Crash before binding port
}

export const config = parsed.data as Readonly<typeof parsed.data>;
```

**Rule:** Never import `process.env` directly in route or middleware files.
Always import `config` from `../config`. See `docs/helpers/index.md`.

## Consequences

**Good:**
- Misconfigured deploys fail immediately — PM2 sees a non-zero exit code and alerts
- No server ever starts with default/empty secrets
- Config shape is documented by the Zod schema — new developers can read the schema to
  understand every required variable and its validation rules
- `config` object is typed — TypeScript knows `config.jwtSecret` is always a `string`

**Bad / trade-offs:**
- Process exit in a module-level side effect makes unit testing slightly harder (must mock env before import). Acceptable — config is stable and rarely tested in isolation.

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| Read `process.env` inline in each file | Risk of silent undefined secrets; no central documentation of required vars |
| dotenv-safe package | Validates keys exist but not their format/length; doesn't crash on missing keys by default |
| Runtime check in each JWT sign/verify call | Too late — server is already running and accepting requests |

## Phase Transition
No change planned. Every new service must have its own `config/index.ts` using this pattern.
The Zod schema approach is the reference implementation for all Phase 1+ services.
