# Source comparison

| Odoo source/action | Existing Core3 before this slice | Change |
| --- | --- | --- |
| `action_website_configuration` → `menu_website_website_settings` | No Website Settings page or Configuration menu group | Added `/website-settings` and `Configuration > Settings` route alias with `website.manage` |
| Website settings `Domain` and `website_name` | `website_websites.domain` and `name` were durable but only surfaced on read-only/detail contracts | Added SettingsView fields and page-scoped API save action |
| Settings save | No settings mutation | Added `website.settings.update` with required row version, 404/409/422 guards and persisted update |
| Odoo text controls | Shared SettingsView rendered unknown field types as checkboxes | Added shared styled `text` field rendering; this is reused by the Website settings page |
| Odoo Favicon image widget | No bounded binary settings upload in this slice | Explicit follow-up; no parity claim for favicon upload |
