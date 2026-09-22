# BrowserSkill check

- `bsk doctor`: daemon, protocol, and Chrome extension healthy; one browser
  connected.
- A new no-focus BrowserSkill session was started.
- The user tab list contained a user-owned Odoo PDF tab. Borrowing it with
  `bsk tab borrow` timed out waiting for human confirmation.
- A stale tab id from a prior worker was not retried; no independent browser
  backend, credential inspection, or Playwright fallback was used.
- The BrowserSkill session must be stopped after verification attempts.
