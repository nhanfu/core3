# Verification and blockers

## BrowserSkill attempt

- BrowserSkill daemon: connected, browser instance `245ea108`, extension and
  protocol compatible.
- Session: `fmpi`, stopped cleanly after the blocked borrow.
- User tab: `1770664277`, Odoo title `OdooBot`,
  `http://localhost:8069/odoo/discuss`.
- Requested target: the same Odoo service `http://localhost:8069`, database
  `core3_reference`; credentials were not requested, printed, stored, or
  exposed.
- Borrow result: `tab is borrowed by another session`; the server detail said
  tab `1770664277` was already borrowed by session `gzhm`.

Because the authenticated tab could not be borrowed, no Odoo route inspection,
Core3 authenticated route inspection, desktop/mobile screenshot, or visual
parity claim was made. No Playwright session was used.

## Repository verification

The focused YAML-first integration test passed and proves persistence/reload at
the CRM repository boundary. It does not substitute for the blocked
authenticated visual comparison.
