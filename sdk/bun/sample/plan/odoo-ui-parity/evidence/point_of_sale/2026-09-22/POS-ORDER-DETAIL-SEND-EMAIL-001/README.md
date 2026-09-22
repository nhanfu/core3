# POS-ORDER-DETAIL-SEND-EMAIL-001

Bounded source-backed feature: expose Odoo’s order-detail `Send Email` action
on the Core3 POS order form and queue the email through the existing durable
POS email contract.

Status: functionally complete; authenticated desktop/mobile evidence is
blocked by the required BrowserSkill tab borrow and no visual-parity claim is
made.

Evidence map:

- `odoo-analysis.md` — Odoo source contract and live-browser attempt record.
- `functionality-checklist.md` — pre-code acceptance cases.
- `source-comparison.md` — current Core3 gap and bounded change.
- `gap-matrix.md` — implementation and evidence matrix.
- `test-results.md` — focused, regression, audit, build, and diff checks.
- `verification.md` — BrowserSkill status, borrow blocker, and screenshot
  outcome.

No credentials, cookies, tokens, or screenshots are stored in the repository.
