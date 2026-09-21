# Verification

## Odoo reference

Authenticated BrowserSkill observations were made through browser instance
`245ea108`. The launcher showed no Website or Forum app. `/forum` returned the
Odoo 404 page at the captured desktop and mobile viewports.

Captures:

- `odoo-desktop-launcher.png` — 1916x833 authenticated launcher;
- `odoo-mobile-launcher.png` — 390x844 authenticated mobile menu;
- `odoo-desktop-forum-404.png` — 1916x833 `/forum` 404;
- `odoo-mobile-forum-404.png` — 390x844 `/forum` 404.

This is a source/runtime blocker, not a parity pass: no Odoo accepted-answer
screen or `toggle_correct` interaction could be captured.

## Core3

The isolated Forum runtime reached HTTP readiness on port 4013. A BrowserSkill
navigation reached the Core3 shell title, but the session stopped before an
authenticated detail page rendered or a stable screenshot could be captured.
No Core3 visual claim is made. Contract, persistence, and permission evidence
are the focused test results in `test-results.md`.
