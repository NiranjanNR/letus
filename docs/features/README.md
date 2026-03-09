# Feature Documentation Index

Feature docs explain user-visible functionality in plain language before the code.
They are written for someone who knows JavaScript/TypeScript but hasn't seen this codebase.

**When to create a new feature doc:** When a feature is fully working and could be explained
to a new engineer as a complete unit.

**When to update an existing doc:** After any change that affects the feature's behavior,
API surface, or file structure.

---

## Phase 0 (Complete)

| Feature | Doc | Status |
|---------|-----|--------|
| Authentication | [auth.md](auth.md) | Complete |
| Map Home Screen | [map-home.md](map-home.md) | Complete |
| Mobile Navigation | [mobile-navigation.md](mobile-navigation.md) | Complete |

---

## Phase 1 (Planned — create docs when shipped)

| Feature | Doc | Status |
|---------|-----|--------|
| Post Creation | _(create: post-creation.md)_ | Not started |
| Place Discovery | _(create: place-discovery.md)_ | Not started |
| Feed & Vibe Score | _(create: feed-vibe-score.md)_ | Not started |
| Place Search | _(create: place-search.md)_ | Not started |
| Map Pins | _(create: map-pins.md)_ | Not started |
| Profile & XP | _(create: profile-xp.md)_ | Not started |

---

## Phase 2 (Future)

| Feature | Doc |
|---------|-----|
| Social Graph (follows) | _(create: social-graph.md)_ |
| Friend Stories on Map | _(create: friend-stories.md)_ |
| Explorer Badges | _(create: badges.md)_ |
| Push Notifications | _(create: push-notifications.md)_ |

---

## Feature Doc Template

```markdown
# Feature: [Feature Name]

## What It Does (Plain English)
[2-3 sentences. No jargon. What does the user see and do?]

[SCREENSHOT: description] ← placeholder until screenshots provided

## Key Components / Files
[table: file → role]

## How It Works
[explain mechanism with code snippets where helpful]

## Files Involved
[table: file → role]

## API Endpoints / Interface
[if backend-facing]

## Common Mistakes to Avoid
[links to docs/errors/log.md entries]

## What Phase N Adds
[forward-looking: what's coming]
```
