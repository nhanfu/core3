# Test results

Focused feature test:

```text
bun test test/livechat_transcript_delivery.integration.test.ts --timeout 20000
3 pass, 0 fail, 20 expect() calls
```

The test covers the Odoo source route, page/API join, migration replay, valid
queueing, invalid/open/missing/stale guards, projection refresh, and a
file-backed DuckDB restart.

Adjacent Live Chat regression:

```text
bun test test/livechat*.integration.test.ts --timeout 20000
85 pass, 0 fail, 821 expect() calls across 25 files
```

Additional checks:

- `bunx eslint test/livechat_transcript_delivery.integration.test.ts test/livechat_sessions.integration.test.ts` — passed.
- `bun run audit` — passed: 820 pages, 828 routes, 1,708 datasources.
- `bun run frontend:build` — passed, including Live Chat Sass and the Vite production build.
- `git diff --check` — passed.

Authenticated Odoo/Core3 desktop/mobile visual evidence remains blocked and is
not represented as feature sign-off.
