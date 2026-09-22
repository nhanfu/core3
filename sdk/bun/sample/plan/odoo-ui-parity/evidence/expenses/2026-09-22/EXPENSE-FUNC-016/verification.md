# EXPENSE-FUNC-016 verification

Functional verification uses the real YAML datasource/mutation runtime and
DuckDB migrations. The focused suite covers page/API separation, Odoo-shaped
wizard fields, deterministic tax totals, empty/error states, permissioned line
CRUD, exact-total validation, product-cost denial, tax propagation, stable
child relations, attachment copying, and workflow activity persistence.

BrowserSkill record:

- Instance: `245ea108` was connected and healthy.
- Session `czha` started with `--no-focus` and was stopped cleanly.
- User tab `1770662590` was listed as the authenticated Odoo tab.
- Borrow returned the exact blocker: `tab is borrowed by another session`,
  owner session `cqvt`.
- This worker did not retry the pending borrow, seize the tab, read
  credentials/cookies, or use Playwright/independent login.
- No current live Odoo DOM or desktop/mobile capture was obtained; no visual
  parity claim is made for this feature.
