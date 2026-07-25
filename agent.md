# Agent Guide

This repository contains two main pieces:

- `lib/`: the shared `@core3/framework` library
- `apps/tms/`: the transport management app and its package root
- `lib/test/`: the shared framework test cases

The repo root no longer has its own `package.json`. Run framework/package commands from `lib/` and app commands from `apps/tms/` unless a task explicitly targets a different seam.

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

- `lib/` holds the reusable framework code: components, runtime, backend, HTML helpers, and related interfaces.
- `apps/tms/` holds the app-specific server, pages, UI, DB seed/schema, styles, and types.
- `lib/test/` holds the shared Vitest cases for the framework.
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
- `lib/vitest.config.ts` contains the shared test setup.
