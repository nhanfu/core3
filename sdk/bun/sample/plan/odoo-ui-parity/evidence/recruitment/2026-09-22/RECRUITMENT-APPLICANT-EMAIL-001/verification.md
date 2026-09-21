# Verification notes

An authenticated Core3 desktop session rendered `/applicants`, selected an
applicant, opened the actual `Send Email` modal, filled subject/body, and
submitted through `/api/mutate`. The first submission returned the visible
422 `Select an active applicant email template` because the empty UI select
serialized as `""`; the YAML guard was corrected to normalize blank template
IDs before validation. The runtime was restarted after the correction.

Desktop capture:

- `/tmp/core3-odoo-parity/recruitment-send-email-2026-09-22/core3-send-email-desktop-1440x900.png`
- SHA-256 `c7effabbe67c3dacbac653f75ad0192005f68938ed3f1ca4e58d2327ad86c82b`

This is authenticated Core3 workflow evidence, not live Odoo visual parity.
