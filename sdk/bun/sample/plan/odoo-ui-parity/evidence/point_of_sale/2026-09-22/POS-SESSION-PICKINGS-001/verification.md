# Verification

## BrowserSkill

- Browser instance: `245ea108`.
- Daemon/extension: connected and protocol-compatible.
- Existing Odoo user tab: `1770662590`, listed as `Acme Corporation` at
  `http://localhost:8069/odoo/contacts/9`.
- Worker session: `ppeq`, started with `--browser 245ea108 --no-focus`.
- Borrow attempt: `bsk tab borrow 1770662590 --session ppeq --timeout 60s`.
- Exact blocker: `tab is borrowed by another session`; BrowserSkill identified
  owner session `ssyn`.
- Cleanup: worker session `ppeq` was stopped. The user tab was not altered;
  no credentials, cookies, tokens, or independent login were used.

## Captures and claims

No Odoo or Core3 desktop/mobile screenshots were created for this feature.
Because this worker could not own the authenticated tab, live Odoo DOM/action
inspection and paired visual comparison are blocked. This record intentionally
makes no visual-parity claim. Source inspection, YAML discovery, focused
service tests, and build gates are the available evidence for this commit.
