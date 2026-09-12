# Surveys detailed QA test plan

Module: surveys  
QA owner: surveys-qa  
Developer owner: surveys module owner  
Reference addon/version: survey, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`surveys.md`](../../surveys.md); executed results are in
[`../surveys.md`](../surveys.md).

## Coverage inventory

| Menu/action | Core3 route | State/view scope |
| --- | --- | --- |
| Surveys | `/surveys`, `/surveys/detail`, `/surveys/test`, `/surveys/live-session` | Cards/list, detail form, test/live session, Draft/Published/Closed/Cancelled/Archived |
| Participants | `/surveys/participants`, `/surveys/participant-detail`, `/surveys/participant-print` | List, readonly detail, print, status and event-scoped stats |
| Questions | `/surveys/questions`, `/surveys/question-detail`, `/surveys/suggested-values` | List/form, ordered questions, answer values, CRUD and guards |
| Reporting | `/surveys/analysis`, `/surveys/results`, `/surveys/detailed-answers`, `/surveys/detailed-answer-detail` | Graph/pivot/list, result cohorts, readonly answers, empty/error |

Actors: Administrator/Survey Manager, Survey User, Fleet ordinary user,
unauthenticated public participant, and expired/invalid survey-token user.
Stable fixtures include `survey-demo-feedback`,
`survey-demo-certification`, seeded questions/values/participants/answers,
and the published public survey token.

## Functional and data cases

| Case ID | Class | Route/action | Expected result and persistence assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-001 | functional | Survey list/detail | Search, open, create, edit, duplicate and delete survey definitions | focused suite | pass |
| SURVEYS-FUNC-002 | functional | Questions/values | Add/edit/delete ordered questions and suggested values with relation guards | focused suite | pass |
| SURVEYS-FUNC-003 | functional | Participants/answers | Read participant and detailed answer records scoped to survey | focused suite | pass |
| SURVEYS-FUNC-004 | functional | Results/analysis | Graph, pivot, cohort and answer breakdown use real survey-scoped rows | focused suite | pass |
| SURVEYS-FUNC-005 | functional | Invite/share | Validate recipients, create invite/link audit state and resend safely | invite tests | pass |
| SURVEYS-FUNC-006 | functional | Print/badge | Token-scoped printable output and badge/participant routes render deterministic content | print/badge tests | pass |
| SURVEYS-FUNC-007 | functional | Empty/error/not-found | Every catalog/detail/report returns explicit empty, missing and transport-error state | focused suite; matrix | planned |
| SURVEYS-FUNC-008 | data | Schema/demo | Reapply migrations and verify fixed IDs/counts, no duplicates, stable seed dates | focused suite | pass |

## Workflow and integration cases

| Case ID | Class | Workflow/integration | Expected transition/side effect | Failure/recovery assertion | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-WF-001 | workflow | Survey lifecycle | Draft → Published → Closed → Archived → Draft updates state/version and visible actions | Forbidden/stale transition returns 409 without partial update | pass |
| SURVEYS-WF-002 | workflow | Public response | Start token, validate required answers, advance questions and submit response | Required-answer rejection leaves the response unchanged; start/progress/submit persistence and duplicate-submit guard pass through the public handler; retry matrix remains planned | pass: `surveys_public_response.integration.test.ts` |
| SURVEYS-WF-003 | workflow | Live session | Create/start/advance/end session and preserve participant/session state | Restart/retry does not duplicate session or answers | pass at contract level |
| SURVEYS-WF-004 | integration | Participant invite | Send/resend invite records deterministic audit result | invalid/cancelled recipient and transport failure are explicit | pass at contract level |
| SURVEYS-WF-005 | integration | Durable/external boundary | Timers, mail delivery, callbacks and long-running sessions use Temporal contract when activated | retry, timeout, compensation, replay/restart and shutdown are required | planned |

## Permission and security cases

| Case ID | Actor/scope | Route/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-PERM-001 | Administrator/manager | Definition CRUD, lifecycle, test/live/settings | Allowed and persisted | planned |
| SURVEYS-PERM-002 | Survey User | Read/ordinary write actions | Allowed only for declared `surveys.read/write` operations | planned |
| SURVEYS-PERM-003 | Fleet ordinary user | `/surveys` and direct API | 403 and no data mutation | pass for read boundary; write probe planned |
| SURVEYS-PERM-004 | Public participant | token start/submit/print | Only published token-scoped operations allowed; no admin data leakage | planned |
| SURVEYS-PERM-005 | Invalid/expired token | public endpoints | Stable 401/403/404; no answer or survey disclosure | planned |
| SURVEYS-PERM-006 | Stale/missing record | any mutation | 409/404/422 and unchanged database state | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-UI-001 | Survey landing/detail | 1440x900, 390x844 | Menu, cards, stats, form sections, statusbar, labels and overflow match Odoo | partial |
| SURVEYS-UI-002 | Questions/participants/answers | both | List/form/card/detail fields, pagination and readonly semantics match | partial |
| SURVEYS-UI-003 | Public survey | both | Start/question/done screens, required validation, progression and responsive footer match | partial |
| SURVEYS-UI-004 | Analysis/results/print | both | Graph/pivot/report/print controls and empty/error states match | partial |
| SURVEYS-UI-005 | Current route regression | all 14 routes | 28 authenticated checks with no page/request errors, HTTP errors, blank states or overflow | pass |

## Exit criteria

- Every current Surveys route/action and public boundary has a planned case.
- Full module sign-off still requires paired Odoo comparison, public-flow
  interaction evidence, mutation actor matrix, and persistence after restart.
