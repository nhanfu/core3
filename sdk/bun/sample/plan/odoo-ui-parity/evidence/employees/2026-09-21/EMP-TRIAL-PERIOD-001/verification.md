# EMP-TRIAL-PERIOD-001 verification

## Focused integration

`bun test test/employees_trial_period.integration.test.ts`

- **4 passed, 0 failed, 21 assertions**.
- Source mapping and page/API separation are asserted.
- Employee create and active Payroll update persist the trial end date.
- Actor, stale, wrong-company, invalid-order, invalid-format, missing-version,
  and atomic no-partial-write boundaries are covered.
- Migration replay and file-backed restart preserve both projections.

## Browser/runtime

- Authenticated Odoo desktop/mobile captures succeeded at
  `/odoo/employees/1` and opened the Payroll tab. Screenshots show the
  surrounding Payroll contract fields at 1440x900 and 390x844 with no
  horizontal overflow or page errors. The Odoo form contains no rendered
  `trial_date_end`/End of Trial Period control; this exact source-view gap is
  documented and is not claimed as visual parity.
- Authenticated Core3 desktop/mobile captures loaded
  `/employees/detail?id=employee-demo-001` and opened Payroll with no failed
  requests, page errors, or horizontal overflow. The authenticated session is
  `Core3 Demo Company`, while deterministic Employees fixtures are
  `Core3 Vietnam`, so the record values are empty and manager-only
  `Edit Trial Period` is not exposed in that session. The screenshot and
  JSON evidence are retained as an explicit fixture/permission boundary, not
  a populated UI sign-off.

## Scoped status

Durable migration, CRUD, permission, concurrency, and restart behavior pass.
The Odoo source field is not rendered by the supplied base Employee form and
the Core3 authenticated fixture company does not expose the seeded employee;
no aggregate Employees sign-off is claimed.
