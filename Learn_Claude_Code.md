# 🚀 Claude Code Mastery Guide
### From Zero to Productive — Built for Beginners on Pro Plan

> **How to use this doc:** Read it top to bottom once. Then use the Table of Contents to jump back whenever you need a refresher. This is YOUR playbook.

---

## Table of Contents

1. [The Big Picture — How Claude Code Actually Works](#1-the-big-picture)
2. [Understanding Agents — Your AI Team](#2-understanding-agents)
3. [Tools & Skills — What Agents Can Do](#3-tools--skills)
4. [MCP Servers — Giving Agents Superpowers](#4-mcp-servers)
5. [Your CLAUDE.md — The Brain of Everything](#5-your-claudemd)
6. [Context & Tokens — The Pro Plan Reality](#6-context--tokens)
7. [The Optimal Daily Workflow](#7-the-optimal-daily-workflow)
8. [Prompt Patterns That Actually Work](#8-prompt-patterns-that-actually-work)
9. [Your Letus Project Workflow](#9-your-letus-project-workflow)
10. [The Productivity Explosion Plan (Week by Week)](#10-the-productivity-explosion-plan)
11. [Quick Reference Cheat Sheet](#11-quick-reference-cheat-sheet)

---

## 1. The Big Picture

### What is Claude Code, really?

Most people think of Claude as a chatbot that answers questions. Claude Code is different — it's Claude with **hands**.

```
Regular Claude (claude.ai)
  → You paste code, Claude explains it
  → You ask, Claude responds
  → Claude CANNOT touch your files

Claude Code (terminal)
  → Claude READS your entire project
  → Claude WRITES and EDITS files
  → Claude RUNS commands
  → Claude LOOPS until the task is done
```

The key shift in mindset:

> **Claude Code is not a chatbot. It's a junior engineer sitting next to you who has read your entire codebase.**

### How it actually works under the hood

Every time you type a message in Claude Code, here's what happens:

```
You type: "Add a loading spinner to the login screen"
              ↓
Claude reads CLAUDE.md first (your project rules)
              ↓
Claude reads relevant files (LoginScreen.tsx, styles, etc.)
              ↓
Claude makes a PLAN (thinks step by step)
              ↓
Claude writes/edits files
              ↓
Claude checks its own work
              ↓
Claude reports back to you
```

This entire loop — read, plan, act, verify — is called **agentic behavior**. You don't have to manage each step. Claude handles it.

---

## 2. Understanding Agents

### What is an Agent?

An agent is any AI that can:
1. **Think** about what needs to happen
2. **Act** using tools (read files, run code, search web)
3. **Observe** the result
4. **Decide** what to do next
5. **Repeat** until done

A single message to Claude Code can trigger **dozens of these loops** invisibly. That "Explore (58 tool uses)" you saw? That was Claude looping 58 times reading files.

### Types of agents in Claude Code

#### 🤖 The Main Agent (Claude Code itself)
This is Claude running in your terminal. It reads your prompts, makes decisions, and coordinates everything.

#### 🔍 Subagents (parallel workers)
For big tasks, Claude spins up subagents that work simultaneously:

```
You: "Understand the entire auth system"
           ↓
Main Claude spins up subagents:
  ├── Subagent A → reads auth files
  ├── Subagent B → reads database schema
  ├── Subagent C → reads API routes
  └── Subagent D → reads error logs
           ↓
All 4 finish in parallel (much faster)
           ↓
Main Claude synthesizes everything
           ↓
Main Claude gives you the full picture
```

This is why complex tasks say "58 tool uses" — those are individual subagent actions.

#### 📋 Plan Mode Agent (Shift+Tab × 2)
A special mode where Claude **cannot write any files**. It can only think and plan. Use this before any big feature.

Think of it as: regular agent = contractor who builds immediately. Plan mode agent = architect who draws blueprints first.

### Why agents sometimes go wrong

Agents can fail in predictable ways. Know these so you can course-correct:

| Problem | What happened | Fix |
|---|---|---|
| Claude rewrote the wrong file | It didn't have enough context | Add more detail to your prompt |
| Claude went in circles | Task was too vague | Break it into smaller steps |
| Claude made up an API | It hallucinated | Tell it to read the actual docs file |
| Output was incomplete | Hit token limit mid-task | Use `/resume` after window resets |

### The golden rule of agents

> **Garbage in, garbage out.** The more context and clarity you give the agent, the better it performs. Your CLAUDE.md is the permanent context that fixes this automatically.

---

## 3. Tools & Skills

### What tools does Claude Code have?

Tools are the **actions** an agent can take. Think of them as the agent's hands:

| Tool | What it does | When Claude uses it |
|---|---|---|
| `Read` | Reads any file | Understanding code, checking configs |
| `Write` | Creates new files | Building new features, creating docs |
| `Edit` | Modifies existing files | Fixing bugs, refactoring |
| `Bash` | Runs terminal commands | Installing packages, running tests |
| `Grep` | Searches patterns across files | Finding where a function is used |
| `Glob` | Lists files matching a pattern | Exploring project structure |
| `WebSearch` | Searches the internet | Finding docs, checking libraries |
| `TodoWrite` | Creates a task checklist | Planning multi-step work |
| `Task` | Spins up a subagent | Parallelizing big tasks |

### How to make Claude use the right tools

You guide tool use through your prompts and CLAUDE.md. Examples:

```
❌ Bad: "Fix the login"
✅ Good: "Read the auth flow in docs/features/auth.md first,
          then find and fix the login timeout bug"

❌ Bad: "Add a new API"
✅ Good: "Check docs/helpers/index.md for existing API utilities,
          then add a new endpoint for user preferences"
```

When you specify **where to look**, Claude uses `Read` efficiently instead of `Grep`-ing through everything.

### Skills vs Tools — What's the difference?

- **Tools** = built-in capabilities (Read, Write, Bash, etc.)
- **Skills** = how Claude uses those tools intelligently

Your CLAUDE.md teaches Claude **skills** — like "always check the error log before fixing a bug" or "always write an ADR before making an architecture decision."

You're essentially programming Claude's behavior patterns.

---

## 4. MCP Servers

### What is MCP?

MCP stands for **Model Context Protocol**. It's a standard way to give Claude new tools beyond the defaults.

Simple analogy:
```
Claude Code out of the box = iPhone with default apps
Claude Code + MCP servers = iPhone with any app you install
```

Each MCP server adds new tools that Claude can use.

### MCPs most useful for your Letus project

#### 🐙 GitHub MCP
**What it unlocks:** Claude can create PRs, read issues, manage branches, review code — without you touching GitHub.

```bash
# Install
claude mcp add github-mcp

# What you can now say:
"Create a PR for the auth fix we just made"
"Read the open issues and prioritize them"
"Create a branch called feature/map-clustering"
```

#### 🗄️ Supabase MCP
**What it unlocks:** Claude can query your actual database, write migrations, check data.

```bash
# What you can now say:
"Check if the users table has the new column we added"
"Write a migration to add the preferences table"
"Query how many users signed up this week"
```

#### 🌐 Browsertools MCP
**What it unlocks:** Claude can see screenshots of your running app, click buttons, fill forms — actual browser control.

```bash
# What you can now say:
"Open the app and take a screenshot of the login screen"
"Check if the map loads correctly on mobile viewport"
```

#### 📁 Filesystem MCP
**What it unlocks:** Enhanced file operations, better directory management.

### How to add an MCP server

**Method 1: Claude Code command (easiest)**
```bash
claude mcp add <server-name>
```

**Method 2: Settings file (for advanced config)**

Create or edit `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your_personal_access_token_here"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/your/project"]
    }
  }
}
```

**Method 3: Project-level MCPs**

Create `.claude/settings.json` in your project root (applies only to this project):
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "your_project_url",
        "SUPABASE_SERVICE_KEY": "your_service_key"
      }
    }
  }
}
```

### MCP beginner advice

**Start without MCPs.** Get comfortable with basic Claude Code for 1-2 weeks. Then add GitHub MCP first — it's the most impactful for a solo developer. Then Supabase. Then browser tools.

Adding too many MCPs too early = confusing debugging when things go wrong.

---

## 5. Your CLAUDE.md

### Why CLAUDE.md is everything

CLAUDE.md is automatically read by Claude Code at the start of every session. It's like giving a new team member:
- A company handbook
- Project architecture docs  
- Coding standards
- Known pitfalls to avoid

Without it: Claude starts every session knowing nothing about your project.
With it: Claude starts every session as someone who's been on the team for months.

### The anatomy of a great CLAUDE.md

```markdown
# Project Name

## 1. What this is (2-3 sentences max)
Brief description so Claude immediately knows the domain.

## 2. Tech Stack
List every technology. Claude knows all of them deeply.

## 3. Project Structure
Point to your docs/file-index.md. Claude reads this before touching files.

## 4. Key Commands
Run, test, build, deploy commands. Claude runs these autonomously.

## 5. Coding Rules
Your non-negotiables. Claude follows these like laws.

## 6. Agent Modes
What Claude should do when you say certain things.

## 7. Doc Update Protocol
The checklist Claude runs after every feature ships.

## 8. Known Patterns
Reusable patterns so Claude doesn't reinvent the wheel.

## 9. Error Log Pointer
Point to docs/errors/log.md so Claude reads past mistakes.
```

### Agent Modes — The Power Feature

Add this section to your CLAUDE.md to get dramatically better behavior:

```markdown
## Agent Modes

### 🏗️ ARCHITECT MODE
Trigger words: "plan", "design", "think about", "how should we"
Rules:
- Enter Plan Mode (Shift+Tab × 2) — no file writes
- Write ADR in docs/architecture/adr/ first
- Present options with tradeoffs
- Wait for approval before any implementation

### 🔨 ENGINEER MODE  
Trigger words: "implement", "build", "create", "add"
Rules:
- Read CLAUDE.md + docs/file-index.md first
- Check docs/helpers/index.md for reusable code
- Check docs/errors/log.md for known pitfalls
- Write tests alongside new code
- Update docs/file-index.md after

### 🐛 DEBUG MODE
Trigger words: "bug", "broken", "fix", "error", "not working"
Rules:
- Read docs/errors/log.md first (maybe already solved)
- Reproduce the bug before fixing
- Explain root cause in plain English
- Log the fix in docs/errors/log.md

### 📚 DOC MODE
Trigger words: "document", "explain", "write docs for"
Rules:
- Write beginner-friendly prose
- Add code examples
- Add [SCREENSHOT] placeholders
- Save in docs/features/

### 🔍 EXPLORE MODE
Trigger words: "understand", "explore", "how does X work"
Rules:
- Read broadly before answering
- Use subagents to parallelize reading
- Output a clear summary with file references
- Do NOT modify anything
```

### The Doc Update Protocol

Add this to the bottom of your CLAUDE.md. Claude runs it automatically after every feature:

```markdown
## Doc Update Protocol
Run this checklist after every feature ships:

- [ ] Update docs/file-index.md with any new files created
- [ ] Add ADR if an architectural decision was made
- [ ] Add any new bugs found to docs/errors/log.md
- [ ] Add any new reusable helpers to docs/helpers/index.md
- [ ] Write feature doc in docs/features/ (beginner-friendly)
- [ ] Update docs/architecture/phase-roadmap.md if phase changed
```

---

## 6. Context & Tokens

### What is context?

Context = everything Claude is currently "holding in its head."

This includes:
- Your CLAUDE.md (loaded at start)
- Every message in the current conversation
- Every file Claude has read this session
- Claude's own responses

**The problem:** Context has a limit. On Pro plan, ~44,000 tokens per 5-hour window. When you hit it, Claude stops.

### Token math (rough estimates)

| Thing | ~Tokens |
|---|---|
| 1 page of text | ~500 tokens |
| Average source file | ~300-800 tokens |
| Your CLAUDE.md | ~1,000 tokens |
| One back-and-forth message | ~200-500 tokens |
| Claude exploring 58 files | ~15,000-25,000 tokens |
| Your session so far today | ~30,000 tokens |

### The 5 rules of token efficiency on Pro

**Rule 1: /clear is your best friend**
```
Start task → /clear → fresh 44k window
```
Don't carry old conversation into new tasks. It wastes tokens on irrelevant history.

**Rule 2: CLAUDE.md pays for itself**
Claude reading CLAUDE.md once (~1,000 tokens) saves it from exploring your entire project (~20,000 tokens) every session.

**Rule 3: Batch your requests**
```
❌ Inefficient (burns tokens on multiple round-trips):
"Add a button"
"Now make it blue"  
"Now add a loading state"
"Now add an error state"

✅ Efficient (one round-trip):
"Add a button that is blue, shows a loading spinner while
 the API call is in progress, and shows an error message
 if the call fails"
```

**Rule 4: Time big tasks strategically**
Big exploratory tasks (understanding, architecture planning) burn the most tokens. Do these at the start of a fresh window, not when you're at 80% usage.

**Rule 5: Use /status to check your balance**
```bash
/status  # Shows remaining tokens in current window
```
Check this before starting big tasks.

### What to do when you hit the limit

1. Note what was being built
2. Wait for 5-hour window to reset (or start new session)
3. Run: `/resume` — Claude loads last conversation
4. Say: "Continue implementing [feature], we were in the middle of [specific thing]"
5. Claude picks up where it left off

---

## 7. The Optimal Daily Workflow

### The morning startup ritual (5 minutes)

```bash
# 1. Navigate to your project
cd your-project

# 2. Start Claude Code
claude

# 3. Check what's pending (Claude reads your todos)
"What was I working on last? Check docs/ for context"

# 4. Pick today's focus
"Today I want to build [feature]. Let's plan it first."

# 5. Enter Plan Mode
# Press Shift+Tab twice
```

### The feature development loop

```
PHASE 1: PLAN (Plan Mode — no token waste on bad implementations)
─────────────────────────────────────────────────────────────────
Shift+Tab × 2 → Enter Plan Mode
You: "Plan how to build [feature]. Consider:
     - Existing patterns in docs/helpers/index.md
     - The architecture decisions in docs/architecture/
     - Phase roadmap in docs/architecture/phase-roadmap.md"

Claude produces: Step-by-step plan with file changes listed

You review: Does this make sense? Any concerns?
You approve: "Looks good, implement it"


PHASE 2: IMPLEMENT (Auto-accept mode for speed)
─────────────────────────────────────────────────────────────────
Shift+Tab × 1 → Auto-accept edits
Claude implements the approved plan
You watch the output, intervene only if something looks wrong


PHASE 3: VERIFY (back to manual for safety)
─────────────────────────────────────────────────────────────────
Shift+Tab → Manual approve mode
"Run the tests and show me the output"
"Open the app and describe what you see"
Review the changes together


PHASE 4: DOCUMENT (automated)
─────────────────────────────────────────────────────────────────
"Run the Doc Update Protocol"
Claude updates all docs automatically
Done ✅
```

### The debugging loop

```
/clear  (fresh context for debugging)

"I have a bug: [describe exact symptom]
 Error message: [paste exact error]
 When it happens: [steps to reproduce]
 What I tried: [anything you already attempted]"

Claude:
1. Reads docs/errors/log.md (checks if seen before)
2. Reads relevant files
3. Identifies root cause
4. Proposes fix
5. You approve → Claude fixes → Claude logs it
```

### The end-of-day wrap-up (2 minutes)

```
"Run the Doc Update Protocol and create a brief summary
 of what we built today in docs/session-notes/YYYY-MM-DD.md"
```

This creates a trail you can always `/resume` from.

---

## 8. Prompt Patterns That Actually Work

### Pattern 1: The Context Stack
Always layer context from broad to specific:

```
"You are in [mode]. 
 The goal is [what and why].
 Constraints: [what not to do].
 Start by reading [specific files].
 Then [specific action]."
```

Example:
```
"You are in Engineer Mode.
 Goal: Add push notifications for when a friend shares a location.
 Constraints: Don't change the existing notification service, only extend it.
 Start by reading docs/services/notification-service.md and 
 src/services/NotificationService.ts.
 Then implement the friend-location trigger."
```

### Pattern 2: The Explicit Plan Request
Before any non-trivial task:

```
"Before writing any code, give me:
1. Which files will be created/modified
2. The approach you'll take
3. Any risks or tradeoffs
4. Estimated complexity (simple/medium/complex)

Then wait for my go-ahead."
```

### Pattern 3: The Constraint Sandwich
Wrap every implementation request with guardrails:

```
"[What to build]

Rules:
- Do NOT modify [file/system]
- MUST use the existing [helper/pattern] from docs/helpers/
- MUST follow the [style/convention] established in [file]

After implementing, run the Doc Update Protocol."
```

### Pattern 4: The Debug Brief
Give Claude everything it needs upfront:

```
"Bug report:
- Symptom: [what the user sees]
- Error: [exact error message]
- Reproduction: [steps]
- Environment: [device/OS/version]
- Started happening: [when]
- Did NOT change: [what to rule out]

Fix it and explain the root cause in one sentence."
```

### Pattern 5: The Learning Request
When you want to understand something:

```
"Explain [concept] to me like I'm a developer who knows
 [what you know] but has never seen [what you don't know].
 Use examples from our actual codebase, not generic examples."
```

### Anti-patterns to avoid

```
❌ "Fix it" — no context, Claude will guess wrong
❌ "Make it better" — vague, produces mediocre results
❌ "You know what I mean" — Claude doesn't
❌ Chaining 10 follow-ups — batch it into one good prompt
❌ Asking Claude to "remember" from a previous session — it can't
```

---

## 9. Your Letus Project Workflow

### Recommended file structure additions

Add these to your existing setup:

```
docs/
├── session-notes/          ← NEW: daily logs for easy /resume
│   └── YYYY-MM-DD.md
├── decisions/              ← NEW: quick decision log (not full ADRs)
│   └── quick-decisions.md
└── prompts/                ← NEW: save prompts that worked well
    └── prompt-library.md
```

### The Letus-specific CLAUDE.md additions

Add these sections to your existing CLAUDE.md:

```markdown
## Letus-Specific Rules

### Before touching the map
- Always read docs/features/map-home.md first
- Check docs/architecture/adr/ for map-related decisions
- The map component is performance-critical — profile before optimizing

### Before touching auth
- Read docs/features/auth.md
- Auth is security-critical — no shortcuts, always review ERR-001 to ERR-003

### Database changes
- ALWAYS write a migration file, never modify schema directly
- Read docs/database/ before any schema changes
- Test migration up AND down

### Phase discipline
- Check docs/architecture/phase-roadmap.md before adding features
- If a feature is Phase 2+, log it as a future idea, don't build it now
- Keep Phase 0 clean — MVP only
```

### Your MCP roadmap for Letus

```
Now (Week 1-2):     No MCPs. Master the basics.
Week 3:             Add GitHub MCP → Claude creates PRs for every feature
Week 4:             Add Supabase MCP → Claude writes + verifies migrations
Week 5+:            Add Browsertools → Claude screenshots the running app
```

### Session template for new Letus features

Save this and use it every time:

```
/clear

Context: I'm building [feature name] for Letus, a location-sharing app.
Phase: We're in Phase [X].

Pre-work (do this before any code):
1. Read CLAUDE.md
2. Read docs/architecture/phase-roadmap.md  
3. Read docs/file-index.md
4. Check docs/helpers/index.md for reusable code
5. Check docs/errors/log.md for related past bugs

Feature spec:
- What: [describe the feature]
- Why: [user problem it solves]
- Acceptance criteria: [how we know it's done]

Constraints:
- Must work on iOS and Android
- Must follow existing [pattern/style]
- Must not break [existing feature]

Start in PLAN MODE. Present the plan before writing any code.
```

---

## 10. The Productivity Explosion Plan

### Week 1: Foundation (You're here ✅)

Goals:
- ✅ Claude Code installed
- ✅ CLAUDE.md created with 30 docs
- [ ] Master /clear, /resume, /status commands
- [ ] Do 3 full feature loops (plan → implement → verify → document)
- [ ] Get comfortable with Plan Mode

Daily target: 1 small feature shipped with docs updated

### Week 2: Flow State

Goals:
- [ ] Add Agent Modes to CLAUDE.md
- [ ] Add session-notes/ folder, end every day with a summary
- [ ] Master the prompt patterns from Section 8
- [ ] Build your personal prompt library in docs/prompts/
- [ ] Learn to spot when Claude is going wrong and course-correct fast

Daily target: 2 features shipped, zero rework

### Week 3: Amplify

Goals:
- [ ] Add GitHub MCP
- [ ] Claude creates PRs for every feature — you just review
- [ ] Add your most-used prompts as CLAUDE.md shortcuts
- [ ] Start using subagent parallelism for complex exploration tasks

Daily target: 3 features shipped, Claude managing its own git workflow

### Week 4: Mastery

Goals:
- [ ] Add Supabase MCP
- [ ] Claude writes, applies, and verifies migrations autonomously
- [ ] CLAUDE.md has evolved based on 3 weeks of learnings
- [ ] You're spending more time reviewing than typing

Daily target: You're reviewing Claude's work, not writing specs

### Signs you've hit mastery

- You write prompts in < 30 seconds and Claude gets it right first time
- Your /clear discipline means you rarely hit token limits mid-task
- Claude's first attempt requires minimal revision
- Your docs update themselves
- You feel like you have a senior engineer on call 24/7

---

## 11. Quick Reference Cheat Sheet

### Commands

```bash
claude              # Start Claude Code in current directory
/clear              # Fresh context window (use between tasks)
/resume             # Resume last conversation
/status             # Check token usage remaining
/help               # All available commands
/login              # Switch accounts
```

### Keyboard Shortcuts

```
Shift+Tab           # Cycle permission modes
Shift+Tab × 2       # Enter Plan Mode (no file writes)
Ctrl+C              # Stop current action
↑ arrow             # Recall last prompt
```

### Permission Modes (Shift+Tab cycles through)

```
1. Manual approve    → Claude asks before every file change (safest)
2. Auto-accept       → Claude writes freely (fastest)  
3. Plan Mode         → Claude thinks only, no writes (planning)
```

### Token Budget Rules

```
0-20k tokens    → Normal work, anything goes
20-35k tokens   → Finish current task, /clear before starting new one
35-44k tokens   → Wrap up, /status check, prepare to resume
44k+ tokens     → Window full, wait for reset or start new session
```

### The 5-Step Feature Loop

```
1. /clear
2. Plan Mode → write the plan
3. Auto-accept → implement the plan
4. Manual → verify and test
5. "Run Doc Update Protocol"
```

### Prompt Quality Checklist

Before sending any prompt, ask:
- [ ] Did I say what MODE to use?
- [ ] Did I give the WHY, not just the WHAT?
- [ ] Did I specify which files to read first?
- [ ] Did I list what NOT to change?
- [ ] Did I say what "done" looks like?

---

## Final Thought

The developers who get 10x productivity from Claude Code aren't smarter — they just treat Claude like a real team member. They give it proper context (CLAUDE.md), clear specs (prompts), and a feedback loop (doc protocol).

You've already built the best foundation possible with your 30-file doc structure. That alone puts you ahead of 95% of Claude Code users.

Now it's just reps. Every feature loop you complete makes you faster. Every prompt you refine makes Claude smarter about your project.

In 4 weeks, you'll look back at this guide and realize you've internalized all of it.

**Go build Letus. 🚀**

---

*Last updated: March 2026 | For Claude Code on Pro Plan*
*Next step: Add Agent Modes section to your CLAUDE.md*