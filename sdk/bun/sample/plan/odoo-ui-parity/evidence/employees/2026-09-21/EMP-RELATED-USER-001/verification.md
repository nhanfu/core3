# Verification

## Focused integration

`bun test test/employees_related_user.integration.test.ts`

- **4 passed, 0 failed, 24 assertions**
- Source mapping covers Odoo model/view and separate page/API contracts.
- CRUD covers assign and clear, with durable row projection.
- Guard coverage covers missing actor (403), stale row (409), wrong company
  (404), invalid/disabled catalog identity (422), and already-linked user
  (409), all without partial writes.
- File-backed restart and migration replay preserve the relationship.

## Runtime/browser

- Odoo authenticated desktop and mobile captures succeeded for employee 1;
  Settings > User is visible at both viewports. Seven shell asset 404 console
  messages were recorded as unrelated Odoo shell noise in the JSON captures.
- Core3 authenticated desktop and mobile captures reached the employee route
  with no Employees request error after the bounded runtime became ready. The
  detail is empty because the session company is `Core3 Demo Company` and the
  deterministic employee fixture is `Core3 Vietnam`; this is expected from the
  current-company guard and is recorded as conditional evidence, not sign-off.
- The first bounded startup attempt exposed an invalid cross-service migration
  assumption (`users` was absent from the Employees database). The migration
  was repaired to use the Employees-local deterministic user projection; a
  second bounded startup reached `Backend: http://127.0.0.1:3001` and served the
  authenticated Core3 captures.

## Remaining blocker

The sample does not yet expose a live cross-service auth-user catalog/company
resolver to the Employees database. This slice mirrors the two deterministic
auth identities needed by the sample and preserves their IDs, but does not
claim dynamic parity for arbitrary auth users or normalized company membership.
