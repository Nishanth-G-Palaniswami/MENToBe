# MENToBe

**Live demo:** [men-to-be.vercel.app](https://men-to-be.vercel.app)

A Tinder-style mentorship matching platform. Mentees swipe through curated mentor profiles, mentors triage incoming interest, and mutual matches unlock messaging plus AI-generated meeting notes. Skills, teaching styles, availability, languages, and values are weighted by a matching algorithm into a 0 to 100 score.

## Status

MVP (Minimum Viable Product): a clickable web prototype, **mock-first**. Every backend dependency (auth, matching, messaging, notes, calendar, plan) sits behind a small TypeScript interface in `src/features/<domain>/service.ts` with an in-memory mock under `mock.ts`. Wiring a real backend later means swapping a factory in `App.tsx`, not rewriting screens.

The current build mounts a clickable demo (`src/demo/`) covering: auth, role select, onboarding (profile fields), discover (swipe), candidate detail, matches, chat, profile. Meeting-note generation and the plan tier logic are implemented against the mock services; nothing calls a real model or payment provider yet.

## Quick start

Requires Node 18+ and npm.

```bash
git clone https://github.com/Nishanth-G-Palaniswami/MENToBe.git
cd MENToBe
npm install
npm run dev      # Vite dev server at http://localhost:5173
```

Other scripts:

```bash
npm run build    # type-check + production build
npm run preview  # preview the production bundle
npm run lint     # ESLint over the workspace
```

## Tech stack

| Concern              | Choice                                                       |
| -------------------- | ------------------------------------------------------------ |
| Build                | Vite                                                         |
| Framework            | React 18 + TypeScript (strict)                               |
| Styling              | Tailwind CSS, mobile-first                                   |
| Routing              | React Router v6                                              |
| App state            | Zustand                                                      |
| Server cache         | TanStack Query                                               |
| Forms / validation   | react-hook-form + zod                                        |
| Icons                | lucide-react                                                 |
| Lint / format        | ESLint + Prettier                                            |
| Backend (deferred)   | Node + Fastify, Postgres, Redis, S3, OpenAI                  |

## Features

**Authentication and role selection**
- Google sign-in and email sign-up (mocked)
- Role choice between mentee and mentor on first sign-in

**Profiles**
- Mentee: subjects, career interests, background, languages, meeting frequency, preferred teaching styles, values
- Mentor: teaching style, areas to teach, experience, industries, availability windows, languages, values, supported backgrounds, verification status (with a "Verified Mentor" badge)

**Matching and Discover**
- Curated swipe queue ordered by an integer 0 to 100 match score
- Five weighted components: skills (40%), teaching style (15%), availability (15%), languages (15%), values (15%)
- Stable tiebreak by user id
- Right-swipe records interest, left-swipe records a pass; mutual interest creates a match

**Messaging**
- Match unlocks a 1:1 thread with optimistic send and live updates
- Conversation prompts seed empty threads
- Scheduling card and 14-day re-engagement banner (the latter wired through `isWindowSilent`)
- Validates outgoing bodies via `MessageBodySchema` (trimmed, non-empty, at most 4000 chars)

**Meeting notes**
- Four-section template: Discussion Summary, Action Items, Next Meeting Goals, Shared Resources
- Manual fallback when generation fails, with a single 30s background retry
- Generation is mocked today; the interface is where an LLM call would go

**Plans**
- Free (3 active connections), Mentee Premium ($9.99/mo, unlimited), Mentor Pro ($4.99/mo, unlimited)
- Match creation enforces the cap on both sides; signals are still persisted so a future archive or upgrade can promote a pair to a match

## Architecture

Layered: presentation, application, domain, services.

```
Screens (src/screens, src/demo/screens)
  └─ UI primitives (src/components)
  └─ Hooks (src/hooks)
        └─ Zustand stores (src/lib/stores)
        └─ TanStack Query cache
        └─ Pure domain logic (src/features/*)
              └─ Service interfaces (src/features/*/service.ts)
                    ├─ In-memory mocks (src/features/*/mock.ts)   today
                    └─ HTTP adapters                              future
```

Key choices:

- **Screens stay dumb.** Logic lives in hooks and pure functions in `src/features/`.
- **Zustand for app state, TanStack Query for server cache.** Auth session, current role, and plan tier are global app concerns; candidate queue, match list, threads, and notes are server-cached collections.
- **Time stored in UTC, displayed in IANA local zones.** Availability windows are authored in the user's local zone and stored as UTC ranges plus the originating zone. Wall-clock times are never compared across users.
- **Free-tier cap is enforced when a match would be created, not when a user swipes.** A capped mentee can still express interest; the match record is only created when the cap allows it.

## Project structure

```
.kiro/
  steering/                 # workspace-level rules (product, tech, structure)
  specs/mentormatch-mvp/    # active spec (requirements, design, tasks)
  skills/                   # repeatable agent procedures (e.g. miro-sync)

src/
  main.tsx                  # Vite entry
  App.tsx                   # mounts the clickable demo for now
  demo/                     # clickable prototype (auth, discover, chat, profile)
  screens/                  # spec-aligned screens (see roadmap below)
  components/               # cross-screen UI primitives
  features/                 # per-domain service.ts (interface) + mock.ts (in-memory adapter)
    matching/scoreMatch.ts  # pure scoring fn
    matching/orderQueue.ts  # pure queue ordering
    matching/matchPolicy.ts # pure cap policy
    profile/schemas.ts      # zod schemas for onboarding + message body
  hooks/                    # useAuth, useProfile, usePlan, useMessageThread, useMeetingNotes
  lib/                      # time.ts, id.ts, storage.ts, stores/
  types/                    # shared TypeScript domain types
  styles/                   # Tailwind base + tokens
```

## Roadmap

**Done**
- Vite + React + TS + Tailwind shell (strict mode, brand tokens)
- Domain types, lib utilities, service interfaces + provider
- Pure logic: match scoring, queue ordering, validation schemas, cap policy
- In-memory mocks for every service
- Zustand stores: in-memory session + persisted onboarding draft
- UI primitives (11 components)
- Hooks: `useAuth`, `useProfile`, `usePlan`, `useMessageThread`, `useMeetingNotes`
- Clickable demo end to end with auth/role/onboarding gates and bottom nav
- Demo onboarding captures real profile fields that feed the match scorer and render on the Profile screen

**Deferred**
- Spec-aligned onboarding wizards in `src/screens/Onboarding/`
- Meeting Notes screens (hook and demo provider actions are built; screens are not)
- Availability + Google Calendar sync screen
- Plan management deep view (upgrade CTA already wired in demo Profile)
- Spec-aligned routing + auth/role/profile gates
- Cross-cutting: analytics helper, lazy-load perf, fuller token clearing

## Contributing

Conventions, brand tokens, and the spec source of truth are in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Private prototype. No license granted; all rights reserved. The repository is public so the code can be read and the demo evaluated, not reused.
