# <Module> detailed QA test plan

Module: <module>
QA owner: <qa-agent>
Developer owner: <module-agent>
Reference addon/version: <addon/version>
Plan status: draft | reviewed | approved | superseded
Last reviewed: <date>

This is the test design created before implementation. It is separate from
`../<module>.md`, which records executed runs, defects, fixes, retests, and
sign-off.

## Coverage inventory

Record the complete Odoo menu/action tree, Core3 route/action mapping, view
modes, actors, companies/branches, fixture records, integrations, and durable
workflow boundaries. Link the relevant section of the module sub-plan.

## Functional and data cases

| Case ID | Class | Odoo action/route | Core3 route/API | Setup/actor | Steps | Expected result and persistence assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| <MODULE-FUNC-001> | functional | <action> | <route> | <fixture/user> | <steps> | <result after reload/restart> | <planned artifact> | planned |

Create cases for every menu/action and applicable list, kanban, form,
calendar, pivot, graph, dashboard, report, wizard, and modal. Include create,
read, edit, duplicate, archive, delete, bulk, import/export, attachments,
messages, notifications, required/invalid/boundary values, missing records,
stale row versions, retry, rollback, and idempotent migration/seed behavior.

## Workflow and integration cases

| Case ID | Class | Workflow/integration | Initial state | Action/event | Expected transition/side effect | Failure/retry/recovery assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| <MODULE-WF-001> | workflow | <workflow> | <state> | <event> | <state and related-record result> | <negative/retry/compensation> | <planned artifact> | planned |

Cover every allowed and forbidden transition, approval/rejection,
cancellation, reopen/reset, timer/scheduled event, cross-module update,
email/webhook/file/external API, and Temporal recovery path where applicable.

## Permission and security cases

| Case ID | Class | Actor/scope | Route/API/action | Expected visibility/result | Direct-enforcement evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| <MODULE-PERM-001> | permission | admin/manager/user/unauthenticated | <route/action> | <allow/deny/hidden> | <HTTP/API/browser evidence> | planned |

Cover admin, manager, ordinary user, branch/company scope, cross-company
access, direct API calls, hidden actions, unauthorized mutation, and stale or
expired sessions.

## Visual, responsive, and regression cases

| Case ID | Class | Odoo state | Core3 state | Viewport | Required comparison/assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <MODULE-UI-001> | visual | <normal/detail/modal/error> | <route/state> | 1440x900 and 390x844 | <menu/layout/text/component/overflow parity> | <planned capture> | planned |

Cover normal, detail, create/edit, modal/wizard, empty, loading, error,
permission, and major workflow states at desktop and mobile. Include visible
labels, menu order, tabs, spacing, colors, typography, responsive behavior,
keyboard/focus behavior, and browser console/network errors.

## Exit criteria

- Every visible Odoo action has at least one planned case.
- Every applicable case class above has positive, negative, permission, and
  persistence coverage.
- Test data and expected results are deterministic and tied to YAML contracts.
- The main agent reviewed the plan before the developer batch starts.
- No case is marked pass without reproducible test output or authenticated
  browser evidence.
