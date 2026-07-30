# Agent Guide

This repository contains two main pieces:

- `apps/lib/`: the shared CRM UI/runtime source
- `apps/tms/`: the sample client project and its package root
- The framework currently has no checked-in test suite.

The repo root no longer has its own `package.json`. Run app/package commands from the relevant directory under `apps/`.

## Architectural Direction

`apps/lib/` is a shared, client-agnostic library. Its job is to provide reusable UI/runtime primitives. Do not put business logic, domain models, workflows, customer-specific rules, or other client-specific behavior in `apps/lib/`. Such behavior belongs in the relevant app under `apps/`.

The long-term goal is a YAML-driven framework that uses YAML throughout software development and minimizes client code. YAML should progressively describe the full client system, including:

- page layout and composition
- design-system and UI decisions
- business logic and workflows
- database management, including partitioning and sharding
- deployment and operational configuration

Keep other code types open where they are useful, but make them minimal and treat them as transitional glue: code is acceptable when YAML cannot yet express the required behavior, not as a place to accumulate permanent client or domain implementation.

## What To Know First

- `apps/tms/package.json` is the active app manifest.
- `apps/tms/bun.lock` is the active lockfile.
- `apps/tms/server.ts` is the Bun entry point for the app.
- CRM imports shared source directly from `apps/lib/`; there is no framework package alias.

## Common Commands

Run app commands from the relevant directory under `apps/`:

- `bun run test`
- `bun run test:watch`

The CRM app has no checked-in test files; validate it with its build and browser/API smoke checks.

## Repo Layout

- `apps/lib/` holds only reusable, client-agnostic CRM framework code: components, runtime, HTML helpers, and related services.
- `apps/tms/` holds the sample client project: app-specific server code, YAML, pages, UI, DB seed/schema, styles, and types.
- `spec/` holds architecture and product documentation.

When adding a capability, first consider whether it should be represented in YAML and implemented generically by `apps/lib/`. Keep client-specific declarations in the relevant app under `apps/`. If a temporary code implementation is necessary, keep it narrow and leave a clear path toward a YAML representation.

## Important Path Rules

- Treat `apps/tms/` as the package root for the app.
- Keep server-side static file serving aligned with `apps/tms/server.ts`.
- `apps/tms/pages/*.yaml` files are server-only datasource definitions and should not be served directly.
- The app serves `apps/tms/index.html`, `apps/tms/app.ts`, and the other files under `apps/tms/` from the app root.

## Editing Rules

- Use `apply_patch` for manual file edits.
- Prefer narrow, local changes over broad refactors.
- Do not revert unrelated user changes.
- Avoid destructive git commands.
- Preserve the existing TypeScript/Bun layout unless the task explicitly asks for a structural change.

## Validation

After changes that affect the app package:

- run `bun run test` from `apps/tms/`
- inspect `git status`

If you change framework code in `apps/lib/`, validate the touched area as narrowly as possible.

## Reference Files

- `readme.md` explains the framework-level architecture.
- `spec/main.html` is the main product/spec reference.
- `apps/tms/server.ts` contains the app runtime and path assumptions.
