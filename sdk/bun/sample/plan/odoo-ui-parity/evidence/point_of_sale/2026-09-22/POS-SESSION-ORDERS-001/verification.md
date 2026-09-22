# Verification

## BrowserSkill

- Browser instance: `245ea108`
- Daemon/extension: connected and protocol-compatible.
- Existing Odoo user tab: listed in the user window.
- Borrow attempt: one `bsk tab borrow` attempt with a 120-second confirmation
  wait; it timed out waiting for browser confirmation.
- Final tab state: remained user-scoped; no authenticated Odoo DOM was owned.
- Cleanup: the task-created BrowserSkill session was stopped; the user tab was
  not altered and no credentials were printed or stored.

## Captures and claims

No Odoo or Core3 desktop/mobile screenshots were created for this feature.
Because the signed-in tab could not be borrowed, live Odoo action inspection
and paired visual comparison are blocked. This record intentionally makes no
visual-parity claim. Source inspection, YAML discovery, focused service tests,
and build gates are the available evidence for this commit.
