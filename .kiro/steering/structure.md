---
inclusion: always
---

# Project Structure

The repository follows the screen-driven layout suggested by the Miro prototype. Each top-level Miro frame maps to a folder under `src/screens/`.

```
.kiro/
  skills/
    miro-sync.md          # skill for re-pulling Miro board context
  specs/
    mentormatch-mvp/      # current active spec (requirements/design/tasks)
  steering/
    product.md            # always-included product context
    tech.md               # stack, conventions, commands
    structure.md          # this file
    miro-board.md         # manual-inclusion: links back to the Miro board

src/
  main.tsx                # Vite entry
  App.tsx                 # router + providers
  routes.tsx              # route table

  screens/
    Auth/                 # role selection + Google/email login
    Onboarding/           # multi-step profile setup (mentee + mentor variants)
    Discover/             # tinder-style swipe queue
    Matches/              # active matches, messaging entry
    Chat/                 # message thread + AI conversation prompts
    MeetingNotes/         # AI-generated session notes archive
    Profile/              # profile + availability + plan management

  components/             # cross-screen UI primitives (Button, Card, Sheet, etc.)
  features/               # cross-cutting domain logic
    matching/             # match scoring, queue management
    messaging/            # thread state, presence
    notes/                # AI-note generation client
    profile/              # profile schema, role-specific extensions

  hooks/                  # reusable hooks (useAuth, useMatchQueue, …)
  lib/                    # framework-agnostic utilities (api client, storage, time)
  types/                  # shared TypeScript domain types
  styles/                 # tailwind base + tokens
```

## Mapping rules (Miro → code)

When translating the board into code, follow these mappings:

| Miro item                              | Code target                                  |
|----------------------------------------|----------------------------------------------|
| Frame (named UI screen)                | `src/screens/<Name>/<Name>.tsx`              |
| Prototype screen (HTML markup)         | Component implementation inside that screen  |
| Sticky note (requirement)              | EARS line in `requirements.md`               |
| User-story table row                   | EARS line + task in `tasks.md`               |
| Connector / arrow                      | Navigation route or service call             |
| UML sequence diagram lifeline          | Service module (`features/<lifeline>/`)      |
| UML sequence message                   | Function on that service                     |

## Naming

- Routes: lowercase kebab (`/discover`, `/meeting-notes/:id`).
- Files: components in PascalCase (`SwipeCard.tsx`); hooks `useThing.ts`; utilities lowerCamel (`scoreMatch.ts`).
- Tests live next to the file (`SwipeCard.test.tsx`) when introduced; do not create test files unless asked.
