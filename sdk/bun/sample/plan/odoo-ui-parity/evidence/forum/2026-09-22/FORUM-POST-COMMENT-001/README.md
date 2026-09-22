# FORUM-POST-COMMENT-001

Bounded YAML-first parity evidence for Odoo `website_forum` post comments.
The slice covers question and answer comment creation, durable persistence,
parent activity refresh, permissions, and optimistic guards.

Artifacts:

- [`odoo-analysis.md`](odoo-analysis.md)
- [`functionality-checklist.md`](functionality-checklist.md)
- [`source-comparison.md`](source-comparison.md)
- [`gap-matrix.md`](gap-matrix.md)
- [`test-results.md`](test-results.md)
- [`verification.md`](verification.md)
- [`browser-check.md`](browser-check.md)

Odoo/Core3 visual pairing is not claimed because the authenticated reference
database does not have `website_forum` installed. The BrowserSkill blocker
captures are referenced in `browser-check.md`.
