# JahitFlow — Planning Index

## Purpose

This `plans/` package is the technical planning source for JahitFlow, a web application for a small/home boutique tailor to manage orders from intake to completion. It is written for a human developer or an implementation agent (referred to here as **Antigravity**) that will build the system feature-by-feature without needing to redesign architecture or guess business rules.

## Document Map

| Document | Purpose |
|---|---|
| `ROADMAP.md` | Phases, module sequence, MVP/post-MVP boundary |
| `ARCHITECTURE.md` | Technical source of truth: system structure, boundaries, stack usage |
| `DECISIONS.md` | Key decisions and trade-offs, with rationale |
| `domain/DOMAIN.md` | Domain concepts, entities, relationships |
| `domain/BUSINESS-RULES.md` | Explicit business invariants |
| `domain/STATE-MACHINES.md` | Order/Fitting/Revision/Payment state rules |
| `database/ERD.md` | Entities, fields, relationships, constraints |
| `api/API.md` | Endpoint groups, contracts, validation/error strategy |
| `tasks/TASK-*.md` | Small, dependency-ordered implementation units |

## Source-of-Truth Hierarchy

```
Product Requirements
        ↓
ARCHITECTURE.md
        ↓
DOMAIN / BUSINESS-RULES / STATE-MACHINES
        ↓
ERD / API
        ↓
ROADMAP
        ↓
TASKS
        ↓
Implementation
```

If two documents conflict, the higher-level document wins. `ARCHITECTURE.md` is the technical source of truth during implementation; if a task seems to contradict it, the task is wrong, not the architecture — see the change protocol below.

## How Implementation Agents Should Use This Planning

1. Read `ARCHITECTURE.md`, `domain/DOMAIN.md`, `domain/BUSINESS-RULES.md`, and `domain/STATE-MACHINES.md` before writing any code — these define constraints that tasks assume but do not repeat in full.
2. Execute tasks in the order given in `ROADMAP.md` / `tasks/`. Each task file is self-contained enough for one work session.
3. Do not invent business rules not stated in `BUSINESS-RULES.md`. If a needed rule is missing, treat it as an ambiguity: make the smallest reasonable assumption, record it, and flag it for review rather than silently deciding.
4. Do not change architecture silently. See **Architecture Change Protocol** below.
5. Update a task's status (not its content) as work completes. Do not rewrite historical task files to match what was actually built — if the plan was wrong, fix the plan explicitly and note why.

## Architecture Change Protocol

If implementation discovers that the current architecture is genuinely insufficient:

1. Stop the affected implementation work.
2. Identify the specific conflict (which rule, which document, why it fails).
3. Explain why the current architecture cannot satisfy the requirement.
4. Propose the **smallest** reasonable change.
5. Record the decision in `DECISIONS.md`.
6. Update `ARCHITECTURE.md`.
7. Update any affected domain/ERD/API/task documents.
8. Only resume implementation once the planning documents are internally consistent again.

No silent architecture drift is permitted.

## Current Implementation Phase

**Planning complete — implementation not yet started.** All tasks in `tasks/` are in `TODO` state. Update this section as phases complete.
