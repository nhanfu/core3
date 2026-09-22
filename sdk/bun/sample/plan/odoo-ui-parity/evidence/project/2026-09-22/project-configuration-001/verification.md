# Verification

Contract, migration, CRUD, stale-row, dependency guard, and Project regression
verification passed. The focused implementation does not claim complete Project
module parity.

BrowserSkill verification limitation:

- Browser instance: `245ea108`.
- Authenticated Odoo tab: `1770662590`.
- Borrowing session: `expk`.
- Exact results: initial `tab is borrowed by another session` for session
  `expk`; later 30-second borrow-confirmation timeout for fresh session `ksja`.
- Action: no independent browser/login, no credentials or tokens printed, and
  no shared session stopped; fresh session `ksja` was stopped cleanly.
- Captures: none; desktop/mobile visual parity is pending.
