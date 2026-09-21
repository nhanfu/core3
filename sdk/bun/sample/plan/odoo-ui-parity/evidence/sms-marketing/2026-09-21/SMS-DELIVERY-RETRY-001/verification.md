# Verification

## Authenticated Odoo reference

- Desktop Apps page capture: `/tmp/core3-odoo-parity/sms-wave5-odoo-apps-desktop.png`
- Mobile Apps page capture: `/tmp/core3-odoo-parity/sms-wave5-odoo-apps-mobile.png`
- Desktop observation: authenticated application menu contains Email Marketing
  and other installed applications, but not SMS Marketing; the Apps catalog
  lists SMS Marketing as an installable app.
- Mobile observation: authenticated Apps catalog likewise lists SMS Marketing,
  while the compact application menu does not expose the installed SMS module.
- Exact blocker: `mass_mailing_sms` is not installed in `core3_reference`, so
  no authenticated Odoo SMS mailing form, Retry button, trace list, or trace
  form can be opened. The captures are blocker evidence only, not paired UI
  parity evidence.

## Core3 evidence boundary

The Core3 functional/restart evidence is contract-level in
`test/sms_marketing_delivery_retry.integration.test.ts`. No authenticated
Core3 visual parity claim is made in this feature record until the paired Odoo
module is available.
