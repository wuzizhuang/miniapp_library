# AGENTS.md

## Purpose
This repository contains a full-stack library management system with a Spring Boot backend and a Next.js frontend. Use this file as the default working agreement for all Codex tasks in this repo.

## Repo layout
- `backend-library/`: Spring Boot backend, controllers in `controller/`, business logic in `service/impl/`, persistence in `repository/`, config/resources in `src/main/resources/`.
- `front_library/`: Next.js Pages Router frontend, route pages in `pages/`, shared UI in `components/`, API wrappers in `services/api/`, types in `types/`, global styles in `styles/`.
- Root docs and helper scripts may exist for local startup, but product logic lives in the two apps above.

## Product context
This is not a demo-only repo. Treat it as a real application with two main surfaces:
1. Reader-facing flows: auth, catalog, book detail, borrowing, reservation, favorites, reviews, fines, notifications, feedback, user center.
2. Admin-facing flows: dashboard analytics, books, copies, loans, reservations, fines, review moderation, users, feedback, authors, categories, publishers, RBAC.

Prefer completing existing business flows over inventing new modules.

## How to work
- Read the relevant files first. Do not rewrite unrelated modules.
- Prefer small, reviewable patches that keep existing architecture intact.
- Preserve API contracts unless the task explicitly asks for a breaking change.
- When frontend and backend both need changes, update both sides in one task so the feature is actually usable.
- Keep changes consistent with the current naming and folder structure.
- Do not introduce new major dependencies unless clearly necessary.
- When behavior changes, update or add the nearest documentation/comments that explain the new behavior.

## Planning and execution
- For non-trivial work, first produce a short implementation plan with touched files, risk points, and verification steps.
- Then implement.
- After implementation, run the narrowest useful verification commands first, then broader checks if available.
- Summarize exactly what changed, what was verified, and any remaining known limitations.

## Windows-first local commands
Use PowerShell-friendly commands unless the task explicitly targets another environment.

### Backend
- Run app: `cd backend-library; .\\mvnw.cmd spring-boot:run`
- Run tests: `cd backend-library; .\\mvnw.cmd test`

### Frontend
- Install deps: `cd front_library; npm install`
- Run dev server: `cd front_library; npm run dev`
- If `package.json` exposes lint/build/test scripts, prefer running the relevant existing script instead of inventing a new command.

## Backend rules
- Keep controllers thin; put business rules in `service/impl/`.
- Reuse existing DTO and response shapes where possible.
- Validate permissions explicitly for admin-only behavior.
- Preserve transactional consistency for borrow/return/reservation/fine flows.
- Avoid silently swallowing exceptions; return clear API errors that the frontend can handle.
- When adding query capabilities, prefer repository/service support over ad-hoc controller filtering.

## Frontend rules
- Keep Pages Router conventions; do not migrate to App Router as part of feature work.
- Reuse existing service wrappers in `services/api/` before creating new fetch logic.
- Keep loading, empty, error, and permission states explicit in UI.
- Prefer incremental UI changes that match the current design system.
- Preserve deep-link behavior from notifications when modifying reader pages.

## High-value quality checks
For feature work, prioritize verifying these areas when relevant:
- Auth and role-based access behavior
- Borrow / return / renew / lost flows
- Reservation fulfill and cancel flows
- Fine payment / waiver flows
- Notification read / routing / cleanup flows
- Admin CRUD screens and list refresh behavior

## Definition of done
A task is done only when all of the following are true:
- The requested behavior works end-to-end in the current architecture.
- Frontend and backend contracts are aligned.
- Obvious regressions in touched flows are checked.
- New UI states are not missing loading/error/empty handling.
- Any important caveat is documented in the final summary.

## What to avoid
- Do not add placeholder pages that are not wired to real data.
- Do not leave UI actions that predictably return 403/404 without fixing the permission logic or hiding the action.
- Do not duplicate business logic across controller, service, and frontend.
- Do not convert real API screens back to mock data.

## Preferred task style
When given a feature request, execute in this order:
1. Confirm current implementation by reading code.
2. List gaps against the requested target state.
3. Implement backend support if needed.
4. Implement frontend integration.
5. Verify critical paths.
6. Report changed files, results, and follow-up risks.
