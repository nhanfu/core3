# Odoo UI parity shared test cases

This is the canonical cross-module verification ledger. The single shared
tester owns it and keeps it current after every module-agent handoff and bug
fix. Module agents provide reproducible routes, fixtures, and commits; they do
not create separate test ledgers.

## Lifecycle

1. The module agent registers or updates the cases for its Odoo menu/action.
2. The tester runs the Core3 and authenticated Odoo route at `1440x900` and
   `390x844`, records the result and temporary capture paths, and links any
   mismatch to `bug-fixes.md`.
3. The module agent fixes the linked issue and commits source/tests/docs only.
4. The tester reruns the case and marks it `pass`, `blocked`, or `deferred`
   with evidence. A module is not `parity-signed-off` until all applicable
   cases pass or an exact source/environment blocker is recorded.

## Required case categories

| Case ID | Category | Required assertion |
| --- | --- | --- |
| UI-001 | Menu | Odoo application/menu/submenu, ordering, action, labels, and visibility match Core3 |
| UI-002 | Desktop | Authenticated Odoo/Core3 render at 1440x900 matches frame, geometry, typography, spacing, color, and controls |
| UI-003 | Mobile | Authenticated Odoo/Core3 render at 390x844 matches responsive layout with no unintended overflow |
| UI-004 | States | Populated, empty, filtered, loading/error, and permission-denied states are covered where applicable |
| UI-005 | Views | List/Kanban/Form/Pivot/Graph/Calendar tabs and transitions match Odoo and use visible text |
| UI-006 | Interaction | Search, filters, grouping, navigation, create/edit, archive/status actions, and dialogs match Odoo |
| UI-007 | Data | Deterministic fixtures expose every visible field, relation, status, and summary used by the screen |
| UI-008 | Permissions | Allowed and denied roles produce the same visible action boundaries as Odoo |
| UI-009 | Regression | Focused integration tests, UI audit, lint, and diff check pass after the fix |
| UI-010 | Sign-off | Tester records evidence, unresolved bug IDs, and final module status in this ledger and `progress.md` |

## Module case register

| Case ID | Module | Odoo action/route | Core3 route | State/fixture | Desktop capture | Mobile capture | Result | Tester/date | Bug ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — | pending registration | shared tester | — |

Do not claim a screenshot or visual comparison from static YAML, a server
readiness probe, or an unauthenticated login page.
