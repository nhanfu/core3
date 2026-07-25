# Agent Guide

This repository contains two main pieces:

- `lib/`: the shared `@core3/framework` library
- `apps/tms/`: the transport management app and its package root

The repo root no longer has its own `package.json`. Run app/package commands from `apps/tms/` unless a task explicitly targets the shared framework or root-level tests.

## What To Know First

- `apps/tms/package.json` is the active app manifest.
- `apps/tms/bun.lock` is the active lockfile.
- `apps/tms/server.ts` is the Bun entry point for the app.
- `apps/tms/vitest.config.ts` is the Vitest config used by the app scripts.
- `lib/package.json` defines the local framework package that `apps/tms` consumes through `file:../../lib`.

## Common Commands

Run these from `apps/tms/`:

- `bun run dev`
- `bun run start`
- `bun run test`

The test command is configured to run the repo-level Vitest suite from the `apps/tms` package root.

## Repo Layout

- `lib/` holds the reusable framework code: components, runtime, backend, HTML helpers, and related interfaces.
- `apps/tms/` holds the app-specific server, pages, UI, DB seed/schema, styles, and types.
- `test/` holds the shared Vitest cases for the framework.
- `spec/` holds architecture and product documentation.

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
- `apps/tms/vitest.config.ts` contains the current test harness setup.
