# Source comparison

Odoo 19 source reviewed under `/home/nhanjs/projects/odoo`:

- `odoo/addons/base/wizard/base_partner_merge_views.xml:1-110` declares the
  `Automatic Merge Wizard`, its manual destination/contact list, `Merge
  Contacts`, `Skip these contacts`, and `Cancel` controls, and binds
  `action_partner_merge` to `res.partner` list and kanban views.
- `odoo/addons/base/wizard/base_partner_merge.py:410-473` limits merges to
  two or three contacts, rejects parent/child pairs, rejects differing emails
  for non-admin users, redirects related records, logs the operation, and
  deletes source partners.

Existing Core3 inspection found `pages/contacts.yaml` selectable but without a
bulk Merge action and `api/contacts.yaml` without a merge action or mutation.
The existing export, archive, CRUD, duplicate, activity/chatter, attachment,
and child-relation actions were preserved.

The implementation is YAML-first: `pages/contacts.yaml` owns layout and the
bulk action entry; `api/contacts.yaml` owns the destination datasource,
permission, mutation, refresh, and validation contract through
`page.id: contacts`. Migration `20260922150000-022-contact-merge.yaml` owns
the deterministic same-email duplicate fixture and durable audit table.
