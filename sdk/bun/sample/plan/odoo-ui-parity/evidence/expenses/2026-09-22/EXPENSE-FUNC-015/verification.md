# EXPENSE-FUNC-015 verification

Functional verification passed through the real YAML datasource and migration
contracts. The posted fixture returns a payment target and the in-payment
fixture returns a journal-entry target. Wrong-company, empty, unavailable, and
migration replay cases are covered. The navigation destinations are the
existing permissioned Accounting detail routes.

BrowserSkill record:

- Instance: `245ea108`.
- The user tab `1770662590` was listed as authenticated Odoo Contacts.
- Borrow returned: `tab is borrowed by another session`; details identified
  owner session `wbjh`.
- This worker did not retry, seize, or bypass the borrowed tab.
- Worker session `onmb` was stopped cleanly.
- A diagnostic blank agent-window capture was saved outside Git at
  `/tmp/core3-odoo-parity/expenses-func-015/browser-blocker-agent-window.png`;
  it is blocker evidence, not an Odoo action capture.
- No Odoo DOM or desktop/mobile screenshot was captured; no visual-parity claim
  is made. The visual gate remains open for a later worker after the tab is
  returned.
