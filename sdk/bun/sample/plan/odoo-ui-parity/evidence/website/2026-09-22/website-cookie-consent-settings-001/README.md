# WEBSITE-SETTINGS-COOKIE-CONSENT-001

## Source trace

The local Odoo 19 source at `/home/nhanjs/projects/odoo/addons/website/views/res_config_settings_views.xml` declares the Website settings card `website_cookies_bar` and its dependent `website_block_third_party_domains` control. The related Website model stores `cookies_bar` and `block_third_party_domains` and uses them to gate third-party tracker handling.

## Core3 bounded implementation

- `services/website/pages/settings.yaml` exposes the Website-owned Tracking & Consent settings card.
- `services/website/api/settings.yaml` reads and persists both flags through the existing `website-settings` contract under `website.manage`.
- `services/website/migrations/20260922240000-019-website-cookie-consent-settings.yaml` adds the durable third-party-domain blocking flag with Odoo's enabled-by-default behavior.
- `test/website_cookie_consent_settings.integration.test.ts` covers source tracing, YAML page/API joining, boolean normalization, stale writes, restart replay, and the read-only permission boundary.

## Browser evidence

BrowserSkill instance `245ea108` was healthy, but the authenticated Odoo tab `1770662590` was already borrowed by session `iqyf`. The tab was not taken over, no independent login or Playwright session was used, and this slice has no Odoo desktop/mobile screenshots or visual-parity claim. The owned BrowserSkill session was stopped after the borrow was rejected.

## Remaining gaps

This slice covers the authenticated Website Settings configuration contract and durable flags. Public cookie-banner rendering, consent persistence, custom blocked-domain editing, and paired authenticated Odoo/Core3 desktop-mobile evidence remain open.
