# Browser blocker

BrowserSkill preflight on 2026-09-22:

- Shared browser instance: `245ea108`, Chrome 145.0.0.0, extension 0.3.0.
- `bsk status --json` and `bsk doctor` passed; the daemon, protocol, and
  extension were connected.
- The user-scope tab list included the authenticated Odoo tab titled `Acme
  Corporation`.
- Borrowing that tab from a new session was rejected with the exact error:
  `tab is borrowed by another session`, with the hint that it was borrowed or
  being borrowed by session `ssyn`.
- The new BrowserSkill session was stopped cleanly. The existing session and
  tab were not interrupted, returned, or replaced.

Captures: none. Ownership was denied before page observation, so no Odoo
action read, desktop/mobile screenshot, Core3 comparison capture, or
visual-parity claim is represented here. Playwright and independent login were
not used.
