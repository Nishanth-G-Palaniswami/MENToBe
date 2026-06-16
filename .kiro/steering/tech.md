---
inclusion: always
---

# Tech Stack & Conventions

## MVP stack (web prototype first)

The Miro board calls for native iOS and Android, but for the v0 prototype we ship a **mobile-first web app** that mirrors the prototype screens. This lets us iterate on flows without paying the native toolchain tax up front. Once flows stabilize, we wrap with Capacitor or port to React Native + Expo.

- **Build tool:** Vite
- **Framework:** React 18 + TypeScript (strict)
- **Styling:** Tailwind CSS, mobile-first; brand color is a violet/purple (matches prototype). Primary `#7C3AED`, accent `#EC4899` for "match" CTAs.
- **Routing:** React Router v6
- **State:** Zustand for app state, TanStack Query for server cache once the API is wired
- **Icons:** lucide-react
- **Forms:** react-hook-form + zod for validation
- **Lint/format:** ESLint + Prettier (default Vite TS config)

## Backend (deferred)

Document the contract before building. Plan: Node + Fastify or NestJS, Postgres for relational data, Redis for messaging presence, S3-compatible storage for verification documents, OpenAI for matching scores and meeting-note generation. Wire mocks first; treat the matching algorithm and AI notes as injectable services.

## Coding conventions

- TypeScript strict mode on, no `any` without justification.
- One component per file, named export. PascalCase filenames for components, camelCase for utilities.
- Co-locate component-specific styles; reach for Tailwind utilities before custom CSS.
- Domain types live in `src/types/`. Reuse them; do not redeclare DTOs at each call site.
- Pure functions over class hierarchies for matching logic. Easier to test, easier to swap.
- Prefer `function` declarations for components, `const` arrow functions for hooks/utils.
- Keep screens dumb; push logic into hooks (`useMatchQueue`, `useMessageThread`, etc.).

## Commands

These are the standard scripts, defined in `package.json`:

- `npm run dev` — start Vite dev server (run manually; do not invoke from agent shell)
- `npm run build` — type-check and build production bundle
- `npm run preview` — preview production build
- `npm run lint` — ESLint over the workspace

## Platform notes

This workspace runs on Windows with cmd. Long-running processes (`npm run dev`) must be launched manually by the developer, not by the agent.
