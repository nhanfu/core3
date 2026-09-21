# CRM-LEAD-DUPLICATES-001

Bounded source-backed evidence for the Odoo CRM Similar Leads stat action.

- Date: 2026-09-22
- Owner: CRM module owner
- Odoo source: `/home/nhanjs/projects/odoo/addons/crm`
- Core3 route: `/crm/lead-duplicates`
- Core3 page/API ID: `crm-lead-duplicates`
- Odoo action: `crm.lead.action_show_potential_duplicates`
- Permissions: `crm.read` for the count, drill-down datasource, and row navigation
- Status: conditional bounded implementation; no module sign-off

The existing CRM bulk `merge_leads` action is a separate feature and was not
changed by this slice.
