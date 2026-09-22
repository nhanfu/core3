# Odoo analysis

Reference: local Odoo 19 source under `/home/nhanjs/projects/odoo`.

- `addons/website/views/res_config_settings_views.xml` defines
  `action_website_configuration` (`Settings`) for `res.config.settings`.
- `menu_website_website_settings` is under Website > Configuration and opens
  that action for the system group.
- The Website app settings form exposes General > Domain and Website
  Identification > Name and Favicon. The form also has a website selector in
  its header; this bounded slice scopes a selected Core3 Website by ID and
  leaves favicon upload for a separate asset slice.
- Odoo labels used by this slice are `Domain`, `Website Identification`, and
  `Name`; the help text says the website name is displayed in the browser tab.
