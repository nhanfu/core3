# Agent Guide

This repository contains two main pieces:

- `lib/`: the shared `@core3/framework` library
- `apps/tms/`: the sample client project and its package root
- `lib/test/`: the shared framework test cases

The repo root no longer has its own `package.json`. Run framework/package commands from `lib/` and app commands from `apps/tms/` unless a task explicitly targets a different seam.

## Architectural Direction

`lib/` is a shared, client-agnostic library. Its job is to process client YAML and render pages. Do not put business logic, domain models, workflows, customer-specific rules, or other client-specific behavior in `lib/`. Such behavior belongs in a client project, currently exemplified by `apps/tms/`, until it can be expressed through the framework.

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
- `lib/package.json` is the active framework manifest and owns the test command.
- `lib/vitest.config.ts` is the Vitest config for the framework test suite.
- `lib/package.json` defines the local framework package that `apps/tms` consumes through `file:../../lib`.

## Common Commands

Run these from `lib/`:

- `bun run test`
- `bun run test:watch`

The test command is configured to run only the framework test cases under `lib/test/cases`.

## Repo Layout

- `lib/` holds only reusable, client-agnostic framework code: YAML processing, page rendering, components, runtime, backend primitives, HTML helpers, and related interfaces.
- `apps/tms/` holds the sample client project: app-specific server code, YAML, pages, UI, DB seed/schema, styles, and types.
- `lib/test/` holds the shared Vitest cases for the framework.
- `spec/` holds architecture and product documentation.

When adding a capability, first consider whether it should be represented in YAML and implemented generically by `lib/`. Keep client-specific declarations in `apps/tms/` (or the relevant client project). If a temporary code implementation is necessary, keep it narrow and leave a clear path toward a YAML representation.

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

If you change framework code in `lib/`, validate the touched area as narrowly as possible.

## Reference Files

- `readme.md` explains the framework-level architecture.
- `spec/main.html` is the main product/spec reference.
- `apps/tms/server.ts` contains the app runtime and path assumptions.
- `lib/vitest.config.ts` contains the shared test setup.
