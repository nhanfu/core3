# TIMEOFF-ACCRUAL-PLAN-EMPLOYEES-001

Date: 2026-09-22
Module: Time Off
Feature: Odoo `hr.leave.accrual.plan.action_open_accrual_plan_employees`
Reference: `http://localhost:8069`, database `core3_reference`
Browser instance: `245ea108`, bsk session `vmnr`

## Source contract

The local Odoo 19 source defines the stat button in
`/home/nhanjs/projects/odoo/addons/hr_holidays/views/hr_leave_accrual_views.xml`
(`hr_accrual_plan_view_form`) and the action in
`/home/nhanjs/projects/odoo/addons/hr_holidays/models/hr_leave_accrual_plan.py`
(`action_open_accrual_plan_employees`). It opens `Accrual Plan's Employees` on
`hr.employee` with `kanban,list,form` and the domain of employees referenced by
the plan's allocations; the stat is conditional on a non-zero employee count
and requires `hr.group_hr_user`.

## Core3 evidence

- Layout: `services/time_off/pages/accrual-plan-detail.yaml` and
  `services/time_off/pages/accrual-plan-employees.yaml`.
- API/actions: `services/time_off/api/accrual-plan-detail.yaml` and
  `services/time_off/api/accrual-plan-employees.yaml`, joined by matching
  `page.id` values.
- Persistence: migration
  `services/time_off/migrations/20260922110000-022-accrual-plan-employees.yaml`.
- Focused test: `test/time_off_accrual_plan_employees.integration.test.ts`.
- Result: **PASS**, 2 tests / 18 assertions. This proves the stat/action
  contract, manager permission, stable allocation relation, search/empty/503
  states, idempotent migration/index, and file-backed restart reads.

## Live Odoo blocker

The authenticated desktop observation on `core3_reference` showed the Discuss
shell and no Time Off menu. Direct `/odoo/action-632` also showed no Time Off
surface, and direct `/odoo/time-off` resolved to Discuss. Mobile emulation
showed only the Discuss mobile shell and no Time Off action. No credentials,
cookies, or tokens were read, and no Odoo data was mutated.

Captured blocker images (local only, not committed):

- `/tmp/core3-odoo-parity/timeoff-accrual-plan-employees-20260922/odoo-core3-reference-desktop-1440x900.png`
- `/tmp/core3-odoo-parity/timeoff-accrual-plan-employees-20260922/odoo-core3-reference-direct-action-desktop-1440x900.png`
- `/tmp/core3-odoo-parity/timeoff-accrual-plan-employees-20260922/odoo-core3-reference-mobile.png`
- `/tmp/core3-odoo-parity/timeoff-accrual-plan-employees-20260922/odoo-core3-reference-mobile-time-off-route.png`

The Core3 authenticated browser capture could not start in this checkout. The
shared discovery pass fails before `/api/modules` with the unrelated dirty-file
error `services/fleet/api/vehicles.yaml YAML Parse error: Unexpected token`.
That path is outside the Time Off scope and was not changed.

## Disposition

Conditional bounded pass only. No paired Odoo/Core3 visual-parity claim and no
full Time Off module sign-off.
