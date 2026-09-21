# Verification

## Odoo reference

Authenticated BrowserSkill captures from browser instance `245ea108`:

- `odoo-activity-desktop-1916x833.png` — 1916x833 Agent Window viewport.
- `odoo-activity-mobile-390x844.png` — 390x844 iPhone emulation with touch.

Both captures show the loaded My Expenses Activity mode, six activity columns,
and the `Schedule activity` footer.

## Core3 blocker

The local Core3 runtime responded unauthenticated at `http://localhost:4000/expenses`
with HTTP 200, but no authenticated BrowserSkill capture was made in this
handoff because the user-directed BrowserSkill session was closed before the
Core3 verification step. Therefore this evidence records no Core3 visual or
authenticated interaction pass. API persistence/contract tests and the static
audit/build gates pass; paired visual parity remains conditional.
