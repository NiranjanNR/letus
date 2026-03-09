# Architecture Decision Records (ADRs)

An ADR is a permanent record of a significant technical decision: what was decided, why,
what alternatives were rejected, and how it changes in future phases.

**Rule:** Once accepted, an ADR is never deleted. It can be marked `Superseded by ADR-NNN`.
**When to write one:** Any decision that, if reversed, would require changing more than one file.

---

## Index

| # | Title | Status | Phase |
|---|-------|--------|-------|
| [001](001-timing-safe-auth.md) | Timing-safe auth — bcrypt always runs | Accepted | 0 |
| [002](002-refresh-token-rotation.md) | Single-use refresh token rotation | Accepted | 0 |
| [003](003-in-memory-rate-limit.md) | In-memory rate limiting (Phase 0) | Accepted, superseded in Phase 1 | 0→1 |
| [004](004-postgis-day-one.md) | PostGIS enabled from day one | Accepted | 0 |
| [005](005-graceful-shutdown.md) | Graceful SIGTERM shutdown | Accepted | 0 |
| [006](006-centralized-api-client.md) | Centralized API client with token refresh | Accepted | 0 |
| [007](007-no-select-star.md) | No SELECT * in any SQL query | Accepted | 0 |
| [008](008-config-validation-at-boot.md) | Config validation crashes at boot | Accepted | 0 |
| [009](009-cors-allowlist.md) | CORS allowlist (not wildcard) | Accepted | 0 |
| [010](010-10kb-body-limit.md) | 10kb request body size limit | Accepted | 0 |

---

## ADR Template

Copy this exactly when writing a new ADR. File name: `NNN-kebab-case-title.md`

```markdown
# ADR-NNN: [Title]

**Status:** Accepted | Deprecated | Superseded by ADR-NNN
**Date:** YYYY-MM-DD
**Decider:** Human | claude-opus-4-6 | claude-sonnet-4-6
**Phase:** 0 | 1 | 2

## Context
[1-3 sentences. What problem or constraint forced this decision?
What would happen without it?]

## Decision
[1-2 sentences. Exactly what was decided. Be specific.]

## Implementation Location
[Exact file path(s) and optionally line numbers where this is implemented]

## Consequences

**Good:**
- [bullet]

**Bad / trade-offs:**
- [bullet]

## Alternatives Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| [option]    | [reason]     |

## Phase Transition
[If this decision is explicitly temporary, describe what replaces it and when.
If permanent, write "No change planned. Applies to all phases."]
```

---

## Writing Guidelines

- **Context** explains the _threat_ or _constraint_, not just the background. What goes wrong without this decision?
- **Decision** is one concrete sentence. Avoid weasel words ("we try to", "generally").
- **Alternatives Rejected** must have at least one row. If you can't think of an alternative, you haven't thought hard enough.
- **Phase Transition** is the most important field for Phase 0 temporary decisions. It lets Phase 1 agents know exactly what to replace without re-evaluating the decision from scratch.
- **Decider** uses the exact model ID string or "Human" — not "Claude" or "AI".
