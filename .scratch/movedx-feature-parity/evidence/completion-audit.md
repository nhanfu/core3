# Parity Completion Audit

Audited 2026-07-26 against `.scratch/movedx-feature-parity/PRD.md`.

## Proven

- 68 page YAML definitions load through the authenticated page API.
- 122 server-owned datasource definitions execute successfully on a fresh seeded database.
- 51 registered SPA routes mount in a real browser with zero route-panel or console-error failures.
- Every page YAML has a route-specific evidence directory and controls checklist.
- Every route has local desktop/tablet evidence, including the five provisional legacy pages.
- Named workflow actions, field allowlists, and audit writes remain server-authorized; framework tests pass 137/137.

## Not Proven

- The PRD requires reference desktop/tablet captures for every route. The workspace contains only the eight supplied reference captures (dashboard, orders, customers, and vehicles), so additional reference-state parity cannot be verified from local evidence.
- The PRD asks for automated interaction coverage for every control. The browser audit now exercises shared column choosers, status tabs, search inputs, safe editor open/dismiss behavior, sortable headers, next-page controls, and exports when present; it does not yet cover every workflow transition.

## Current commands

```sh
TMS_BASE_URL=http://localhost:3339 bun run audit
TMS_BASE_URL=http://localhost:3339 TMS_CDP_URL=http://localhost:9222 bun run audit:ui
bun run test # from lib/
```

The goal remains active until authoritative reference states and full control-level interaction coverage are available.
