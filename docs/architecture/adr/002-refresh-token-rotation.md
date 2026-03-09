# ADR-002: Single-Use Refresh Token Rotation

**Status:** Accepted
**Date:** 2024-01-01
**Decider:** Human
**Phase:** 0

## Context
Refresh tokens have a 7-day lifespan and are stored in the device keychain. If a refresh
token is stolen (via backup extraction, malware, or a compromised device), the attacker has
7 days of silent, undetectable access. Standard single-token strategies provide no signal
that a token has been compromised.

## Decision
Every time a refresh token is used, it is immediately deleted from the database and a new
refresh token is issued alongside the new access token. Each refresh token can be used
exactly once.

## Implementation Location
`services/user/src/routes/auth.ts` — POST /auth/refresh handler

Sequence:
1. Verify the presented refresh token JWT signature
2. Look up the token in `refresh_tokens` table — if not found, return 401 (already used or revoked)
3. DELETE the old token row
4. INSERT a new refresh token row
5. Return new `{ accessToken, refreshToken }`

## Consequences

**Good:**
- If a stolen refresh token is used by an attacker, the legitimate device's next refresh
  call will fail (token already consumed) — forcing re-authentication and surfacing the breach
- Server-side logout works: DELETE the refresh token row and it becomes immediately invalid
- Multi-device support: each device has its own token row; one device's logout doesn't affect others

**Bad / trade-offs:**
- If a refresh response is lost in transit (network drop after server-side DELETE but before
  client receives the new token), the user is logged out and must re-authenticate.
  This is an acceptable edge case at Phase 0 scale.
- Slightly more DB writes per session than long-lived tokens

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| Long-lived access token only | Stolen token gives full access for its entire lifespan |
| Stateless refresh token (no DB) | Cannot revoke without a blocklist, which is its own DB table |
| Short-lived sessions (re-auth every day) | Poor UX; 7-day sessions with rotation give equivalent security |

## Phase Transition
No change planned. Applies to all phases. Phase 1 will add `POST /auth/revoke-all` to
invalidate all refresh tokens for a user (logout from all devices), implemented as
`DELETE FROM refresh_tokens WHERE user_id = $1`.
