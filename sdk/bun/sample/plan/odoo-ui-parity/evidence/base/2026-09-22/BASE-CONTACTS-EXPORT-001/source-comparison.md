# Source comparison

## Odoo 19

- Addon: `contacts`, depending on `base` and `mail`.
- Window action: `addons/contacts/views/contact_views.xml`, `action_contacts`,
  model `res.partner`, list/kanban/form/activity modes.
- Contact list source: `odoo/addons/base/views/res_partner_views.xml`,
  `view_partner_tree` and `view_res_partner_filter`.
- The generic Odoo list Action menu exposes Export. Export uses the current
  list domain and produces a downloadable CSV through the web export flow.

## Core3 before this slice

`services/base/pages/contacts.yaml` declared a visible `contacts.export` item,
but `services/base/api/contacts.yaml` had no action with that ID. The client
therefore found no action definition and did not initiate a download.

## Core3 after this slice

`api/contacts.yaml` owns a `type: client` action with the same stable ID and
`base.contacts.read` permission. It queries the existing `contacts` datasource
using current list filters, paginates until the datasource total is covered,
and downloads a CSV with the current contact list columns plus Active status.
The layout remains free of datasource records and backend action definitions.
