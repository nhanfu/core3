# EMP-BANK-TRUST-001 verification

## Implementation

Odoo's `action_toggle_primary_bank_account_trust` is a user-visible Personal
tab action that toggles the selected primary bank account's payout trust flag.
Core3 keeps the page/API contracts separate: the API mutation toggles the
durable `employee_bank_accounts.trusted` value and increments both the line and
parent employee row versions; the page binds that action to the bank-account
line grid. Existing bank-account migration `20260920230000-034` supplies the
replay-safe schema and deterministic primary/secondary fixtures.

## Focused verification

`bun test test/employees_bank_account_trust.integration.test.ts`

- 3 passed, 0 failed
- 20 assertions
- Covers Odoo source/action mapping, page/API separation, employees.write and
  actor/company/parent-row/line-row guards, durable toggle behavior, migration
  replay, and file-backed restart.

Scoped ESLint passed for the focused test. `git diff --check` passed before
staging. The repository audit was attempted after the contract change but is
blocked by the pre-existing shared Employees discovery error recorded below.

## Authenticated browser evidence

### Core3

Desktop and mobile browser attempts reached the authenticated login URL but
could not authenticate because page discovery returned HTTP 500:
`PageSchemaError: Invalid page definition: actions[4].fields is not allowed`.
The error is in the existing shared Employees API/page catalog before this
slice's toggle action is reached. Screenshots and raw results are retained in
`core3-desktop.png`, `core3-mobile.png`, and the Core3 JSON files. No Core3 UI
pass or populated-row mutation claim is made.

### Odoo

Authenticated `core3_reference` desktop and mobile sessions loaded Abigail
Peterson's `/odoo/employees/6` form and Personal tab. The Bank Accounts group
was visible, but the reference employee had no populated bank-account row, so
the trust action could not be clicked. This is a precise reference-data
blocker, not a failed guard. Raw results and screenshots are retained in the
Odoo JSON/PNG files.

## Disposition

The durable API/page contract, permissions, concurrency guards, fixtures, and
restart behavior are verified. Browser comparison remains conditional on the
existing Core3 discovery error and an Odoo employee with a bank-account row;
no aggregate Employees sign-off is claimed.
