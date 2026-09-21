# Fleet manufacturer Models action browser check — 2026-09-22

Feature: `fleet-manufacturer-models-action-20260922`

## Result

Visual parity is blocked and no Odoo or Core3 parity claim is made. The
BrowserSkill daemon was connected to the requested Chrome instance `245ea108`.
The authenticated user tab list exposed Odoo tab `1770662590` at
`http://localhost:8069/odoo/contacts/9` (`Acme Corporation`). A dedicated
BrowserSkill session `zqun` requested a borrow of that existing tab, but the
required browser confirmation did not complete before the default timeout.
The tab was not borrowed, no independent login or Playwright session was used,
and no credentials, cookies, or tokens were inspected.

The owned BrowserSkill Agent Window remained `about:blank`. These captures are
blocker artifacts only and are not Odoo/Core3 UI evidence:

- Desktop blocker capture, 1916x833: `browser-agent-window-blocker-desktop.png`
- Mobile blocker capture, emulated 390x844: `browser-agent-window-blocker-mobile.png`

The session was stopped after the timeout. No borrowed tab remained to return.

## Source fallback

The exact Odoo contract was verified from the local revision `65975996`:
`addons/fleet/models/fleet_vehicle_model_brand.py`, `action_brand_model`,
returns `fleet.vehicle.model`, view mode `list,form`, and context keys
`search_default_brand_id` and `default_brand_id`. Live Odoo route/action
rendering could not be inspected because the authenticated tab borrow was
blocked; this limitation is intentionally retained.
