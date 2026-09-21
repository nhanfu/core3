# Fleet Contract Logs CRUD — evidence index

Feature ID: `fleet-contract-crud-20260921`

This is the next Fleet slice after the vehicle-form stat actions and Odometer
Logs CRUD checkpoint. It covers the source-backed `fleet.vehicle.log.contract`
create/edit/delete surface, optimistic concurrency, archive/restore, and
clickable status transitions.

| Artifact | Purpose |
| --- | --- |
| [`odoo-analysis.md`](odoo-analysis.md) | Local Odoo 19 source and live-menu trace |
| [`functionality-checklist.md`](functionality-checklist.md) | Acceptance checklist and result |
| [`source-comparison.md`](source-comparison.md) | Odoo/Core3 mapping |
| [`gap-matrix.md`](gap-matrix.md) | Supported, deferred, and blocked decisions |
| [`test-results.md`](test-results.md) | Focused and regression test evidence |
| [`verification.md`](verification.md) | Browser, persistence, and visual-gate record |

Authenticated blocker captures, deliberately outside Git:

- Odoo desktop menu: `/tmp/core3-odoo-parity/fleet-contract-crud-20260921/odoo-desktop-fleet-menu-unavailable.png`
- Odoo mobile page: `/tmp/core3-odoo-parity/fleet-contract-crud-20260921/odoo-mobile-fleet-menu-unavailable.png`
- Odoo mobile menu: `/tmp/core3-odoo-parity/fleet-contract-crud-20260921/odoo-mobile-fleet-menu-open.png`

No Core3 parity screenshot is claimed: after the CRM discovery issue was
resolved, the runtime reached `/vehicles` but `/api/modules` returned 502 and
the host hit `EMFILE` file-descriptor exhaustion. The Odoo captures prove the
reference limitation only; they are not presented as Fleet parity evidence.
