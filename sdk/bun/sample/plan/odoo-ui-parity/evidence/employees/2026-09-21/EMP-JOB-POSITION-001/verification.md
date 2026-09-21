# EMP-JOB-POSITION-001 verification

QA inventory:

- Source mapping: Odoo `job_id` and Work > Job Position map to separate API
  and page YAML contracts.
- User-visible control: Edit Job Position with a company-scoped options list;
  assign and clear both change the displayed relation and the active Payroll
  snapshot.
- Boundaries: missing actor, wrong company, unsupported/inactive job, missing
  active Payroll version, and stale employee row must reject atomically.
- Persistence: deterministic migration replay and file-backed restart retain
  the relation.
- Exploratory cases: clear a populated relation; select a job belonging to a
  different company.

Verification results:

- Focused integration: `test/employees_job_position_assignment.integration.test.ts`
  — 4 tests, 23 assertions passed.
- Odoo authenticated desktop capture: `odoo-desktop.png`, 1440x1100;
  `odoo-captures.json` reports Job Position visible.
- Odoo authenticated mobile capture: `odoo-mobile.png`, 390x844;
  `odoo-captures.json` reports Job Position visible in the rendered body.
- Core3 desktop/mobile attempt: `core3-captures.json` records the bounded
  authenticated route attempt and the exact runtime blocker. The dev process
  exposed the expected URLs, but the process exited before the browser could
  complete the route (`ERR_CONNECTION_REFUSED` on port 3002); no Core3 UI
  sign-off is claimed.

This is conditional feature evidence only; it is not aggregate Employees
parity sign-off.
