# Email Marketing detailed QA test plan

Module: email-marketing  
QA owner: email-marketing-qa  
Developer owner: email-marketing module owner  
Reference addon/version: mass_mailing, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`email-marketing.md`](../../email-marketing.md); executed
evidence is recorded in [`../email-marketing.md`](../email-marketing.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Mailings/campaigns | mailing, campaign, stage, tag and favorite-filter routes | Mailing CRUD, audience filters, workflow, scheduling, cancellation and immutable sent state |
| Mailing contacts | contacts, subscriptions, import and blacklist routes | Contact import/CRUD, opt-out/resubscribe, blacklist and list counts |
| Reporting | analysis, traces and opt-out report routes | Graph/pivot/list filters, delivery traces, opt-out-only scope and empty states |
| Configuration | settings, link trackers and opt-out reasons | Manager settings, tracker/reason CRUD, validation and stale guards |

Actors are Marketing Manager, Marketing User, ordinary user, wrong-company
user and unauthenticated user. Fixtures use stable campaigns, mailings,
contacts, lists, stages, tags, trackers, traces, opt-outs and settings. Import
and mutation tests use isolated databases; recipient and timestamp fixtures are
deterministic and must not depend on current time.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| EMAIL-FUNC-001 | Campaigns/mailings | List/detail search, filters, CRUD and audience links use service-owned persisted data | pass: focused suite |
| EMAIL-FUNC-002 | Mailing workflow | Draft → test → schedule/send/cancel/retry guards readiness and immutable sent rows | pass: focused suite |
| EMAIL-FUNC-003 | Contacts/subscriptions | Import, add/edit, unsubscribe/resubscribe, delete and list counts persist after reload | pass: focused suite |
| EMAIL-FUNC-004 | Blacklist/opt-out | Blacklist and opt-out reason rules prevent invalid delivery and preserve audit data | pass: focused suite |
| EMAIL-FUNC-005 | Configuration | Stages, tags, filters, trackers, opt-out reasons and settings validate CRUD and stale writes | pass: focused suite |
| EMAIL-FUNC-006 | Reports/traces | Analysis and trace reports expose deterministic grouped rows, filters and read-only contracts | pass: focused suite |
| EMAIL-FUNC-007 | Empty/error/not-found | Empty, missing, forbidden and transport-error states are explicit for every datasource | pass at contract level |
| EMAIL-FUNC-008 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate recipients, mailings or traces | planned restart/migration gate |
| EMAIL-FUNC-009 | Upload/export/print | Exercise contact import upload validation, mailing export and exposed report/print actions | planned browser interaction gate |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| EMAIL-WF-001 | Mailing delivery lifecycle | Test → schedule → send/cancel/retry transitions update state/version atomically | pass at contract level; browser workflow planned |
| EMAIL-WF-002 | Recipient eligibility | Blacklist, opt-out and invalid addresses are filtered without corrupting list membership | pass: focused suite |
| EMAIL-WF-003 | Contact import | Named and plain addresses import idempotently and update list counts | pass: focused suite |
| EMAIL-WF-004 | Tracking/reporting | Link tracker and trace rows remain linked to the owning mailing and report scopes | pass at contract level |
| EMAIL-WF-005 | Durable/external boundary | Email delivery, scheduling, retries, callbacks and cross-module workflows use Temporal when durable; retry, replay, restart and compensation are tested | planned |
| EMAIL-WF-006 | Completed mailing duplicate | Sent mailing Duplicate creates a new Draft copy without sending or mutating the source; restart preserves the copy | planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| EMAIL-PERM-001 | Marketing Manager | Campaign, mailing, contact and configuration mutations succeed | planned browser actor gate |
| EMAIL-PERM-002 | Marketing User | Permitted mailing/contact reads and actions stay within company/list scope | planned |
| EMAIL-PERM-003 | Ordinary user | Settings, technical traces and protected writes return 403 without row changes | pass at contract level |
| EMAIL-PERM-004 | Wrong company | Campaigns, contacts, mailings, traces and settings are not leaked or mutable | planned |
| EMAIL-PERM-005 | Unauthenticated/expired | Redirect/401/403 without protected response data | planned |
| EMAIL-PERM-006 | Stale/missing/invalid | 409/404/422 leaves current mailing/contact/configuration unchanged | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| EMAIL-UI-001 | Mailings/campaigns | 1440x900, 390x844 | Menu order, list/form/kanban states, audience controls and responsive layout match Odoo | planned |
| EMAIL-UI-002 | Contact/import/blacklist | both | Contact list, import dialog, opt-out and blacklist states match Odoo | planned |
| EMAIL-UI-003 | Reports/settings | both | Graph/pivot/list reports, traces, settings and configuration forms match Odoo | planned |
| EMAIL-UI-004 | Current route regression | all manifest-owned Email Marketing routes | Authenticated desktop/mobile checks have no blank/redirect, page/request error or overflow | planned |
| EMAIL-UI-005 | Mailing duplicate form | 1440x900, 390x844 | Sent mailing exposes Duplicate and the copy form has no overflow; paired Odoo route is captured or the exact installed-reference blocker is recorded | planned |

## Exit criteria

Full Email Marketing sign-off requires the focused suite, authenticated CRUD
and mailing/contact workflows, all actor boundaries, reload/restart
persistence, complete responsive route coverage, and paired Odoo desktop/mobile
comparisons. The focused contract suite alone is not module completion.
