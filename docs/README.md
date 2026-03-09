# Letus Documentation

Welcome to the Letus project documentation. This folder is the single source of truth for
architecture decisions, feature explanations, operational guides, and AI agent context.

**AI agents:** Start with [`../CLAUDE.md`](../CLAUDE.md) at the repo root, then use this
index to navigate to specific docs.

---

## Quick Navigation

| I need to... | Go to |
|-------------|-------|
| Understand the whole system | [architecture/overview.md](architecture/overview.md) |
| Find what any file does | [file-index.md](file-index.md) |
| Understand a feature | [features/](features/) |
| See why a decision was made | [architecture/adr/](architecture/adr/) |
| Look up an API endpoint | [services/user-service.md](services/user-service.md) |
| See the DB schema | [database/schema.md](database/schema.md) |
| Run the app locally | [infra/local-dev.md](infra/local-dev.md) |
| Deploy to EC2 | [infra/ec2-deploy.md](infra/ec2-deploy.md) |
| Build for TestFlight | [infra/eas-testflight.md](infra/eas-testflight.md) |
| Find a reusable helper | [helpers/index.md](helpers/index.md) |
| Avoid a known pitfall | [errors/log.md](errors/log.md) |
| See Phase 1+ roadmap | [architecture/phase-roadmap.md](architecture/phase-roadmap.md) |

---

## Structure

```
docs/
├── README.md                      ← This file
├── file-index.md                  ← Every source file with 1-line purpose
│
├── architecture/
│   ├── overview.md                ← System diagram and architecture narrative
│   ├── data-flow.md               ← Request lifecycle diagrams
│   ├── phase-roadmap.md           ← Phase 0→3 plan with status
│   └── adr/                       ← Architecture Decision Records
│       ├── README.md              ← ADR index and format template
│       ├── 001-timing-safe-auth.md
│       ├── 002-refresh-token-rotation.md
│       ├── 003-in-memory-rate-limit.md
│       ├── 004-postgis-day-one.md
│       ├── 005-graceful-shutdown.md
│       ├── 006-centralized-api-client.md
│       ├── 007-no-select-star.md
│       ├── 008-config-validation-at-boot.md
│       ├── 009-cors-allowlist.md
│       └── 010-10kb-body-limit.md
│
├── features/                      ← Beginner-friendly feature explanations
│   ├── README.md                  ← Feature doc index
│   ├── auth.md                    ← Authentication system
│   ├── map-home.md                ← Map Home screen
│   └── mobile-navigation.md       ← Expo Router + auth guard
│
├── services/
│   ├── user-service.md            ← Complete user service API reference
│   └── future-services.md         ← Phase 1+ service specifications
│
├── database/
│   ├── schema.md                  ← All tables, columns, indexes
│   └── migrations.md              ← Migration runner and conventions
│
├── infra/
│   ├── local-dev.md               ← Local development setup
│   ├── ec2-deploy.md              ← EC2 + PM2 + GitHub Actions
│   └── eas-testflight.md          ← EAS + TestFlight
│
├── helpers/
│   └── index.md                   ← Reusable utilities — check before writing new code
│
└── errors/
    └── log.md                     ← Permanent bug and anti-pattern log
```

---

## Documentation Conventions

### Feature docs (`features/`)
Written for a junior engineer who knows JavaScript but is new to this codebase.
Start with "what it does in plain English", then explain the mechanism.

### ADRs (`architecture/adr/`)
Written for anyone making a related decision in the future.
Never deleted. Marked `Superseded by ADR-NNN` if replaced.

### Error log (`errors/log.md`)
Written the moment a bug is found and fixed.
Never deleted. Marked `RESOLVED` when fixed, `OPEN` when awaiting a future phase.

### File index (`file-index.md`)
Machine-parseable format. Updated whenever a file is added, renamed, or deleted.
The most important doc for AI agent navigation.

---

## Contributing to Docs

When you add a feature, run the **Doc Update Protocol** from `CLAUDE.md`:
1. Update `file-index.md` for any new files
2. Write or update the feature doc in `features/`
3. Add an ADR if an architectural decision was made
4. Add an error log entry if a bug was found
5. Update `database/schema.md` if the schema changed
6. Update `architecture/phase-roadmap.md` if a phase milestone was crossed
