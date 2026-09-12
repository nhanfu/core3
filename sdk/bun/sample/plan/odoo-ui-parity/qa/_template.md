# <Module> QA ledger

QA slot: <qa-slot>
Module owner: <module-agent>
Verification trigger: feature-complete | merge-candidate | post-merge | refactor | release
Candidate commit: <commit>
QA state: dormant | ready-for-test | qa-in-progress | qa-failed | ready-to-merge | signed-off | blocked

Detailed test plan: `qa/test-plans/<module>.md`
The detailed test plan must be reviewed and approved before implementation;
this ledger records execution against that plan.

## Test cases

| Test ID | Odoo action/route | Core3 route | Functional scenario/state | Evidence | Result | Date |
| --- | --- | --- | --- | --- | --- | --- |
| <ID> | <action> | <route> | <scenario> | <path/output> | pending | <date> |

## Bugs and retests

| Bug ID | Failure | Evidence | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- |
| <ID> | <failure> | <path/output> | <commit> | <result> | open |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: pending
