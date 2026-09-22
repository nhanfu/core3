# FORUM-QUESTION-UPVOTE-001 verification

Date: 2026-09-22

## Functional verification

- `bun test ./test/forum_question_vote.integration.test.ts` — 4 passed, 19 assertions.
- `bun test ./test/forum*.integration.test.ts` — 35 passed, 236 assertions.
- `bun run css:build:forum` — passed.
- `bun run frontend:build` — passed.
- `git diff --check` — passed before final staging.

The focused suite proves page/API separation, durable one-user toggle/count
behavior, multiple-user aggregate behavior, stale and own-post protection,
missing-actor and archived no-partial-write guards, file-backed restart, and
the authenticated `forum.read` HTTP boundary.

## Browser verification and blockers

BrowserSkill used shared browser instance `245ea108`; no independent browser or
login was used. The authenticated Odoo tab was listed as tab `1770662590`, but
borrow returned the exact blocker:

`error: tab is borrowed by another session`

`details: tab_borrow: tab 1770662590 is already borrowed or being borrowed by session wabp`

I did not inspect, navigate, or return the other worker's tab. The worker-owned
BrowserSkill session was stopped after the denial.

The existing truthful Odoo environment captures retained for this Forum wave
are:

- `/tmp/core3-odoo-parity/forum/2026-09-22/FORUM-TAG-001/odoo-desktop-launcher.png`
- `/tmp/core3-odoo-parity/forum/2026-09-22/FORUM-TAG-001/odoo-mobile-launcher.png`

They show no Website/Forum app; prior `/forum` returned 404 because
`website_forum` is not installed in `core3_reference`. They are environment
captures, not upvote-action captures.

Core3 runtime readiness was blocked by the unrelated concurrent Website YAML
change. `bun run dev --db=ddb --memory` reached Vite readiness, then exited
with:

`PageSchemaError: Invalid page definition: page config.catalogs is not allowed`

at `sdk/bun/packages/server/src/yaml/schema.ts:315`, while discovering
`services/website/api/settings.yaml`. A BrowserSkill navigation to the target
Core3 route consequently returned `net::ERR_CONNECTION_REFUSED`. No Core3
desktop/mobile screenshots were captured and no Odoo/Core3 visual-parity claim
is made.
