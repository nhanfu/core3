# POS-SESSION-ORDERS-001

Bounded feature: Odoo POS Session form Orders stat-button action.

Artifacts:

- `odoo-analysis.md` records the Odoo source/action contract and live-browser
  blocker.
- `functionality-checklist.md` records the pre-code acceptance cases.
- `source-comparison.md` maps the source-backed gap to Core3 files.
- `gap-matrix.md` records the missing behavior and bounded implementation.
- `test-results.md` records focused/regression/static gate results.
- `verification.md` records BrowserSkill state, omitted captures, and the
  reason no visual-parity claim is made.

No screenshots are included: the required signed-in Odoo tab could not be
borrowed after one confirmation timeout, and no independent login was used.
The implementation is YAML-first and contains no page-local fixture data.
