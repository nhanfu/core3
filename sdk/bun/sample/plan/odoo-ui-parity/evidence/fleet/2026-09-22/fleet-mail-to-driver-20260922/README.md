# Fleet Mail to Driver evidence

Feature: Odoo `action_fleet_vehicle_send_mail` / `fleet.vehicle.send.mail`
Reference revision: `65975996` (Odoo 19 local source)
Core3 database contract: durable DuckDB/Postgres-compatible YAML migrations

Implementation paths:

- `services/fleet/pages/vehicles.yaml`
- `services/fleet/api/vehicles.yaml`
- `services/fleet/migrations/20260922110000-038-fleet-vehicle-mail.yaml`
- `services/fleet/migrations/20260922111000-039-fleet-vehicle-mail-data.yaml`
- `test/fleet_vehicle_mail.integration.test.ts`

Verification: 3 focused tests / 27 assertions passed. The test covers source
mapping, matching `page.id`, selected-driver durable messages, template save,
restart reload, permissions, scope, actor, recipient, content, and atomic
failure guards.

Live-reference blocker: authenticated browser instance `245ea108` on
`core3_reference` has no Fleet application. Direct `/odoo/fleet` returns to the
current non-Fleet shell. The blocker is captured at both requested viewports:

- Odoo desktop launcher, 1916x833:
  `/tmp/core3-odoo-parity/fleet-mail-20260922/odoo-desktop-fleet-launcher.png`
- Odoo mobile launcher, 390x844:
  `/tmp/core3-odoo-parity/fleet-mail-20260922/odoo-mobile-fleet-launcher.png`

These are blocker captures, not authenticated Fleet UI evidence. No desktop or
mobile parity claim is made.
