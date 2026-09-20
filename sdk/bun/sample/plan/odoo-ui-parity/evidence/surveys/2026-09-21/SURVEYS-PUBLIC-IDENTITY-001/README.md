# SURVEYS-PUBLIC-IDENTITY-001

Bounded feature: Odoo public respondent identity capture. A configured text
question can persist its answer as the durable response email or nickname,
while preserving the original answer JSON.

The Core3 browser probe used the source-served backend on port 3390 and Vite
on port 3391. The authenticated actor was `admin@tms.local`; credentials were
used only by the local probe and are not recorded here. The public token was
`identity-public-token-2026`.

Artifacts:

- `core3-desktop-admin.png`, `core3-mobile-admin.png`: authenticated Surveys
  catalog at 1440x900 and 390x844.
- `core3-desktop-identity.png`, `core3-mobile-identity.png`: public identity
  question flow after authenticated browser setup, with email and nickname
  controls visible.
- `core3-browser-results.json`: exact browser results, API flags, and overflow
  checks.
- `odoo-desktop-blocker.png`, `odoo-mobile-blocker.png`, and
  `odoo-blocker.json`: exact paired-reference blocker.
- `source-comparison.md`, `qa-inventory.md`, and `verification.md`: source
  mapping and bounded verification record.

This is bounded evidence only. No Surveys sign-off is claimed.
