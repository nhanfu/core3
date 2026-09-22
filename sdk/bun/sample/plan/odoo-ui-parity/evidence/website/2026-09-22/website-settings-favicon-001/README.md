# WEBSITE-SETTINGS-FAVICON-001

Bounded Website feature: Odoo Website Identification favicon upload/replace.

The source-backed gap was verified after the completed Website page
import/export, settings name/domain, theme, analytics, tracking/SEO, content,
asset, and public rendering slices. This feature adds only the favicon setting;
it does not claim Website module completion or paired visual parity.

- Odoo source: `addons/website/views/res_config_settings_views.xml`,
  `addons/website/models/res_config_settings.py`, and
  `addons/website/models/website.py`.
- Core3 page contract: `services/website/pages/settings.yaml`.
- Core3 API/action contract: `services/website/api/settings.yaml`.
- Durable schema: `services/website/migrations/20260922130000-018-website-favicon.yaml`.
- Focused test: `test/website_favicon_settings.integration.test.ts`.

Visual comparison is blocked because the authenticated Odoo tab is owned by
another BrowserSkill session. See `browser-check.md`; no visual-parity claim is
made.
