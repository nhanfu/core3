# BrowserSkill check

- BrowserSkill daemon: connected Chrome instance `245ea108`.
- Existing user tabs were listed. A borrow was attempted for the Odoo tab
  `1770663926`, but it did not complete and the tab remained user-owned.
- A task-created tab `1770663948` opened
  `http://localhost:8069/web/login?db=core3_reference`. The page showed the
  Odoo user chooser; selecting the saved QA user exposed the password field.
- BrowserSkill human help was requested to enter the local QA password without
  exposing it. The checkpoint arrived before authentication completed, so the
  owned session was stopped and the tab was returned/closed by session cleanup.

No authenticated Odoo action, desktop/mobile screenshot, or visual-parity claim
was recorded. Playwright was not used. Retry with the authenticated borrowed
tab or complete the BrowserSkill QA login before sign-off.
