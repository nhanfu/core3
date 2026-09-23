# Public Website cookie consent — WEBSITE-PUBLIC-COOKIE-CONSENT-001

This bounded slice implements the Odoo Website public cookie-consent service
boundary in Core3's YAML-first Website module.

- Odoo analysis: [`odoo-analysis.md`](odoo-analysis.md)
- Functionality checklist: [`functionality-checklist.md`](functionality-checklist.md)
- Source comparison: [`source-comparison.md`](source-comparison.md)
- Gap matrix: [`gap-matrix.md`](gap-matrix.md)
- Test result: [`test-results.md`](test-results.md)
- Browser verification: [`verification.md`](verification.md)
- Exact BrowserSkill blocker: [`browser-check.md`](browser-check.md)

No screenshots are included. BrowserSkill could not borrow the existing
authenticated Odoo tab, and the current Core3 public Website renderer has no
cookie-banner DOM consumer. This evidence therefore makes no visual-parity
claim; it covers the source-backed YAML/service cookie boundary only.
