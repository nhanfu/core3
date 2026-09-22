# Event tag category tag_ids evidence

Stable feature ID: EVENTS-TAGS-001.

This bounded slice implements the Odoo event_tag_category_action_tree form's
editable tag_ids relation in Core3. The source comparison is based on the
local Odoo 19 source revision recorded in the Events plan.

Evidence files:

- odoo-analysis.md — source fields, action contract, and BrowserSkill blocker.
- source-comparison.md — source-to-Core3 gap mapping and residuals.
- functionality-checklist.md — focused assertions and evidence boundary.
- test-results.md — focused/regression/build results.
- verification.md — browser cleanup and sign-off boundary.

No screenshot is included: the authenticated Odoo user tab was already borrowed
by another BrowserSkill session, so no truthful live desktop/mobile capture was
possible. Core3 visual parity is not claimed.
