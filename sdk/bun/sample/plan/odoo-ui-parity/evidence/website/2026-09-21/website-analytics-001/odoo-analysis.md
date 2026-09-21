# Odoo source analysis

Reference: local Odoo 19 source at `/home/nhanjs/projects/odoo`.

- `addons/website/views/website_views.xml` declares `backend_dashboard` as an
  `ir.actions.client` named `Analytics`, path `website-analytics`, tag
  `backend_dashboard`.
- The same file places `menu_reporting` under Website at sequence 30 and
  `menu_website_analytics` under Reporting at sequence 10. The menu action is
  `ir_actions_server_website_analytics`.
- `addons/website/controllers/backend.py` exposes authenticated readonly
  `/website/fetch_dashboard_data`; it returns the current website, allowed
  website choices, group flags, and an optional Plausible share URL.
- `addons/website/static/src/client_actions/website_dashboard/website_dashboard.js`
  registers `backend_dashboard` and reloads dashboard data when the selected
  website changes.
- `website_dashboard.xml` renders `Go to Website`; without a share URL it
  renders `Easily track your visitor with Plausible` and
  `How to connect Plausible ?`.

Live menu limitation: the authenticated shared browser on instance `245ea108`
exposed Discuss through Expenses but no Website application. Direct
`/odoo/website-analytics` navigation returned Discuss, so no authenticated Odoo
Analytics screen could be compared.
