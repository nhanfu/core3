# SMS-DELIVERY-RETRY-001

Bounded feature: readonly SMS delivery traces plus Odoo's `Retry` behavior for
failed SMS recipients.

Artifacts:

- `odoo-analysis.md`: local Odoo 19 source and authenticated reference result.
- `functionality-checklist.md`: bounded acceptance cases.
- `source-comparison.md`: Odoo/Core3 mapping and deliberate boundaries.
- `gap-matrix.md`: pre-change uncovered gap and implementation result.
- `test-results.md`: focused test command and assertion result.
- `verification.md`: browser evidence and exact blocker.

Browser PNGs are retained outside Git at the reproducible paths recorded in
`verification.md`; they are authenticated Apps-page diagnostics, not claimed
SMS screens, because the reference database has not installed
`mass_mailing_sms`.
