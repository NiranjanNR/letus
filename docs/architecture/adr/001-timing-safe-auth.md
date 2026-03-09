# ADR-001: Timing-Safe Authentication (bcrypt always runs)

**Status:** Accepted
**Date:** 2024-01-01
**Decider:** Human
**Phase:** 0

## Context
The login endpoint queries the database for a user by email. If the user does not exist,
returning immediately creates a measurable timing difference: ~1ms for unknown email vs
~100ms for wrong password (bcrypt cost 12). An attacker can enumerate valid email addresses
at scale using this timing oracle before ever attempting a brute-force attack.

## Decision
Always call `bcrypt.compare()` regardless of whether a user was found in the database.
When no user exists, compare the submitted password against a static pre-computed dummy hash
that always returns false.

## Implementation Location
`services/user/src/routes/auth.ts` — POST /auth/login handler

The dummy hash is computed once at module load:
```typescript
const DUMMY_HASH = await bcrypt.hash('dummy-password-for-timing', 12);
// In handler:
const hash = user?.password_hash ?? DUMMY_HASH;
const valid = await bcrypt.compare(password, hash);
if (!user || !valid) return res.status(401).json({ error: 'Invalid credentials' });
```

## Consequences

**Good:**
- No timing difference between "email not found" and "wrong password" responses
- Email enumeration requires real login attempts with valid credentials, not just timing
- Zero performance cost for legitimate users (bcrypt was running anyway)

**Bad / trade-offs:**
- Login for non-existent email takes ~100ms instead of ~1ms
- Slightly higher CPU cost for failed logins (irrelevant at Phase 0 scale)

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| Return 404 for unknown email | Directly exposes email existence to any caller |
| Add artificial sleep | Fragile — bcrypt timing varies by load; sleep duration is a guess that will drift |
| Rate limit instead of fixing timing | Rate limiting reduces enumeration speed but doesn't eliminate the oracle |

## Phase Transition
No change planned. Applies to all phases. If email verification is added in Phase 1,
the same pattern applies to the verification resend endpoint.
