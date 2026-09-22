# EXPENSE-FUNC-014 verification

Functional verification passed with the focused integration test. The change
uses no migration and touches only the Expenses employee action contracts,
test, and module evidence/plan records.

BrowserSkill record:

- Instance `245ea108`: daemon and extension connected.
- Existing Odoo user tab was listed.
- Borrow request did not transfer the tab; the agent window remained
  `about:blank` and no Odoo DOM or screenshot was read.
- Session `augl` was stopped. No borrowed tab remained, so no tab return was
  necessary.

Because the live tab was unavailable, desktop/mobile captures and visual
parity are explicitly open. This feature is a conditional functional pass,
not a visual sign-off.
