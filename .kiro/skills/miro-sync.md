---
name: miro-sync
description: Re-pulls the Finder Miro board and reconciles requirements, design, and tasks against the current board state.
---

# Miro Sync Skill

Use this skill when the Miro board "Finder" changes and the spec needs to catch up — for example a sticky note is added, a prototype screen is updated, or the sequence diagram gets new lifelines.

## Inputs

- (Optional) A specific Miro item URL to focus on. If omitted, sync the whole board.
- The current spec at `.kiro/specs/mentormatch-mvp/` (requirements.md, design.md, tasks.md).

## Procedure

1. **Authenticate.** Confirm the `miro-codegen` power is active and authenticated to the correct team. The board URL is `https://miro.com/app/board/uXjVHEi3EjE=/`.
2. **Pull overview.** Call `context_get` on the board URL with no `moveToWidget` to get the AI-generated overview.
3. **Enumerate items.** Call `context_explore` on the board URL to list frames, documents, prototypes, tables, and diagrams.
4. **Diff against the spec.**
   - For each frame/screen on the board, ensure there is a matching screen folder under `src/screens/` and a corresponding requirement section in `requirements.md`.
   - For each user-story table row, ensure an EARS-style requirement line and a tasks entry exist.
   - For the sequence diagram, ensure each lifeline has a service module under `src/features/` and each message has a function in that module's API surface.
5. **Refresh the brief.** If the Creative Brief document version (`content_version`) has changed, re-read it via `doc_get` and update `product.md` if the value proposition, tiers, or success metrics shifted.
6. **Pull screen markup when needed.** For prototype screens that need implementation, call `prototype_read` with `include_html=true` and `screen_id=<widget id>` to get the HTML markup, then translate it into a React component under the matching screen folder.
7. **Stage edits, do not auto-commit.** Update spec files in place and surface a summary of changes for review.

## Outputs

- An updated `requirements.md`, `design.md`, and `tasks.md`.
- A short changelog message describing what shifted on the board and what was reconciled in code.

## Guardrails

- Always confirm with the user before creating new boards. This skill is read-only by default.
- Do not call `board_show` on every step — it is meant for a final preview, not for diff loops.
- Set `invocation_source: "skill"` on every Miro tool call you make.
- When mapping Miro frames to React components, follow the table in `structure.md` exactly. Do not invent new folders without updating `structure.md` first.

## Trigger phrases

Activate this skill when the user says any of: "sync the board", "refresh from Miro", "the board changed", "pull the latest spec", or "update the spec from Miro".
