# Maintenance equipment lifecycle parity evidence

Date: 2026-09-12

## Bounded source surface

The verified Odoo 19 source is `/home/nhanjs/projects/odoo`, revision
`65975996`, addon `maintenance`. The source menu is `Maintenance > Equipment`
(`menu_equipment_form`) and its action is `hr_equipment_action`, routed as
`/odoo/equipments`, with `kanban,list,form` views. The source form includes
the Maintenance stat action (`hr_equipment_request_action_from_equipment`),
the Archived ribbon, manager-only cost, and the visible Description, Product
Information, and Maintenance notebook tabs. Odoo archive/delete behavior is
represented by Core3 manager actions on the equipment detail.

Core3 routes are `/maintenance/equipments` and
`/maintenance/equipments/detail?id=<equipment-id>`. The list remains
presentation-only and joins `api/equipment.yaml` by `page.id: equipment`; the
detail joins `api/equipment-detail.yaml` by `page.id: equipment-detail`.
Mutations are service-owned YAML actions: create, edit, archive, reopen, and
delete. Edit/archive/reopen/delete require `maintenance.manage`; reads and the
Maintenance stat remain `maintenance.read`. Delete returns a stable 409 when
maintenance requests reference the equipment, and edits/archive/reopen/delete
require the row version.

## Deterministic fixture and focused coverage

The existing fixed equipment fixtures are used without moving clock values:
`Acer Laptop`, `Archived Printer`, and `CNC Mill 01`, ordered by name and id.
The focused test proves page/API separation, manager/read permissions,
idempotent DuckDB migration, deterministic ordering, edit, archive, reopen,
stale-row conflict, linked-delete protection, and deletion of an unlinked row.

## Authenticated browser evidence

Core3 was run from this worktree at `http://127.0.0.1:3017` with the
authenticated admin user. The desktop and mobile passes opened the equipment
list and detail, opened Edit, and recorded no page errors, failed requests, or
horizontal overflow (`scrollWidth == clientWidth`). Core3 captures are under
`/tmp/core3-odoo-parity/maintenance-next-20260912/` and are intentionally
untracked:

- `core3-equipment-desktop-1440x900.png`
- `core3-equipment-mobile-390x844.png`
- `core3-equipment-detail-final-desktop-1440x900.png`
- `core3-equipment-detail-final-mobile-390x844.png`
- `core3-equipment-edit-desktop-1440x900.png`
- `core3-equipment-edit-mobile-390x844.png`

The Odoo account was authenticated against the active local reference at
`http://127.0.0.1:8073` before implementation. The reference route redirected
to the authenticated Discuss shell in this run, so the comparison reference
uses the previously authenticated Odoo equipment-form captures from the
Maintenance parity gate, copied into this run's evidence directory:

- `odoo-equipment-detail-reference-1440x900.png`
- `odoo-equipment-detail-reference-390x844.png`

Those captures show the source stat button and equipment form. The live route
redirect is a residual evidence limitation, not a claim that this run loaded a
new Odoo equipment screen.

## Residual mismatch

Core3 now matches the bounded lifecycle controls and text-level equipment
fields, but retains the shared Fluent shell and shared OdooFormView rendering
difference from Odoo's purple backend shell, chatter, avatars, relational
widgets, and richer notebook/stat layout. Followers, chatter, attachments,
recurrence generation, and multi-company record-rule enforcement remain
outside this slice.
