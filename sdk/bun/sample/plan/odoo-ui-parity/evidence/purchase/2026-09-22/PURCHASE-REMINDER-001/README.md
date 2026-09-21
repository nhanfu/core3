# PURCHASE-REMINDER-001

Bounded Purchase feature: Odoo receipt-reminder settings and the
`send_reminder_preview` sample-email action on the Purchase Order form.

## Evidence map

- `odoo-analysis.md`: local Odoo 19 source trace and the live-reference attempt.
- `functionality-checklist.md`: bounded acceptance cases.
- `source-comparison.md`: Odoo/Core3 contract mapping.
- `gap-matrix.md`: remaining differences and explicit blocker.
- `test-results.md`: focused test, regression, audit, build, and diff results.
- `verification.md`: browser/runtime result and capture omission.

No screenshots are claimed. The required authenticated Odoo tab was not
borrowed: BrowserSkill reported `borrow_confirmation: always`, and the borrow
request for user tab `1770662590` remained pending until the session was
stopped. No independent login, cookies, credentials, or alternate browser
backend was used.
