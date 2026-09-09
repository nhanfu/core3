# Fleet — sub-plan

Status: `planning`

## Reference

- Odoo addon: `fleet` (Odoo 19 Community)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: manifest/demo records available; preserve populated and empty modes
- Core3 service: `fleet`

## UI inventory

- Fleet dashboard, Vehicles, Drivers, Contracts, Services, Costs, and configuration menus.
- Vehicles kanban/list with status, model, driver, license plate, tags, search, filters, group-by, pager, import/export, and archive.
- Vehicle form with image, model, plate, driver, odometer, fuel, tax/insurance, contract, services, costs, logs, and chatter.
- Vehicle models, drivers, contracts, service logs, cost analysis graph/pivot, mobile cards, dialogs, and empty states.

## Core3 backend mock-data plan

Use `fleet_vehicles`, `fleet_models`, `fleet_drivers`, `fleet_contracts`, `fleet_services`, `fleet_costs`, `fleet_odometer`, `fleet_tags`, `fleet_chatter`, and `fleet_analysis`. `default` covers active/expired vehicles, service/cost rows, odometer history, relations, and complete forms. States: `active`, `contract_expired`, `driver_grouped`, `empty`, `vehicle_form`, `cost_graph`, `cost_pivot`, `mobile`.

## Shared UI primitives

Vehicle image/card, list/card/form tabs, status and date fields, odometer history, relational selectors, attachment/chatter/activity, graph/pivot, archive confirmation, search panel, and mobile navigation.

## Screenshots

Capture Odoo/Core3 at 1440x900 and 390x844 for dashboard, vehicle list/kanban, vehicle form, contracts/services, and cost graph/pivot including empty state.

## Acceptance criteria

- Fleet menus, vehicle fields, status badges, contract/service/cost views, actions, and mobile layouts match Odoo.
- Backend YAML supplies every visible vehicle, relation, history row, chart/pivot value, chatter item, and named empty state.
- Search/filter/group/pager, archive, edit/save/discard, and responsive rendering work without a database and pass the fixture audit.
