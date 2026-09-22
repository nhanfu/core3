# Verification

## Odoo reference

- Existing authenticated Preview evidence is under
  `evidence/accounting/2026-09-22/ACC-INVOICE-PREVIEW-001/`; it shows Pay Now
  on the Odoo invoice portal preview at desktop and mobile sizes.
- This feature did not claim a fresh live Pay Now click because BrowserSkill
  could not borrow the already-owned tab. No Odoo action response is marked
  pass for the click itself.

## Core3

- Focused integration: **3 tests / 18 assertions passed**.
- Authenticated Core3 desktop/mobile verification: **not run** because the
  shared BrowserSkill tab was unavailable and no authenticated Core3 session
  was available through it. No Core3 screenshot or visual-parity claim is
  made.
- Provider completion, external portal access tokens, and final invoice
  settlement remain outside this bounded slice.
