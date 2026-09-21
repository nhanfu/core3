# Verification and blockers

## Browser probe

Browser instance: `245ea108`.

- Desktop URL: `http://localhost:8069/odoo/boms`; authenticated navigation
  rendered Discuss/OdooBot instead of Manufacturing. Capture:
  `odoo-desktop-blocker.png`.
- Mobile URL: same route under emulated iPhone 14 (`390x844`); authenticated
  navigation rendered Discuss/OdooBot and no Manufacturing launcher. Capture:
  `odoo-mobile-blocker.png`.
- No credentials, cookies, or tokens were extracted. The owned bsk sessions
  were stopped after capture.

## Disposition

The source-backed Core3 contract and focused persistence/permission tests pass.
The live-reference visual gate is blocked because the shared authenticated
Odoo profile does not expose the installed Manufacturing addon. No Odoo
Manufacturing desktop/mobile parity claim is made.
