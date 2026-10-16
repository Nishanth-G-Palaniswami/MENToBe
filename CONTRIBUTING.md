# Contributing to MENToBe

This file holds the working conventions that used to live in the README. The README now covers what the app is and how to run it; this covers how to change it.

## Conventions

- TypeScript strict mode on; no `any` without justification.
- One component per file, named export. PascalCase for components, camelCase for utilities.
- `function` declarations for components, `const` arrow functions for hooks/utils.
- Co-locate component-specific styles; reach for Tailwind utilities before custom CSS.
- Domain types live in `src/types/`. Reuse them; do not redeclare DTOs at each call site.
- Prefer pure functions over class hierarchies for matching logic: easier to test, easier to swap.
- Screens stay dumb. Logic lives in hooks and in pure functions under `src/features/`.
- Time is stored in UTC and displayed in IANA local zones. Never compare wall-clock times across users.

## Brand

| Token        | Value      |
| ------------ | ---------- |
| Primary      | `#7C3AED`  |
| Accent       | `#EC4899`  |
| Theme color  | `#7C3AED`  |
| Font stack   | Inter, ui-sans-serif, system-ui |

Tailwind v3 config (`tailwind.config.ts`) ships full 50 to 900 ramps for both `primary` and `accent`.

## Spec source of truth

The active spec is at `.kiro/specs/mentormatch-mvp/`:

- `requirements.md`: EARS acceptance criteria
- `design.md`: architecture, components, data models, sequence diagrams
- `tasks.md`: implementation plan with dependency graph

Steering files (`.kiro/steering/*.md`) carry product, tech, and structure conventions. The original prototype lives on the Miro board "Finder" linked from `.kiro/steering/miro-board.md`.

## Adding a real backend

Each domain exposes an interface in `src/features/<domain>/service.ts` and an in-memory implementation in `mock.ts`. To go live, implement the interface with an HTTP adapter and swap the factory in `App.tsx`. Screens and hooks should not change.
