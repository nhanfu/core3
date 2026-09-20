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
| Reporting | `/surveys/analysis`, `/surveys/results`, `/surveys/detailed-answers`, `/surveys/detailed-answer-detail`, `/surveys/live-session-results` | Graph/pivot/list, result cohorts, readonly answers, current live-question results, empty/error |

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
| SURVEYS-FUNC-009 | functional | Live-session results | Current in-progress question exposes scoped choice and text response statistics | `surveys_live_results.integration.test.ts` | pass |
| SURVEYS-FUNC-010 | functional | Survey detail > Questions > Add a question | Append a normal ordered question from the inline control and refresh the detail graph | `surveys_question_create.integration.test.ts` | pass |
| SURVEYS-FUNC-011 | data/recovery | DuckDB migration rollback/replay | Preserve an access-token response row and its dependent indexes across `0.0.17` rollback and replay | `surveys_migrations.integration.test.ts` | pass |
| SURVEYS-FUNC-012 | participant lifecycle | Send/resend invitation | Persist invitation state, count, deterministic sent-at, and reject invalid/stale replay requests | `surveys_participant_invitation.integration.test.ts` | pass |

## Workflow and integration cases

| Case ID | Class | Workflow/integration | Expected transition/side effect | Failure/recovery assertion | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-WF-001 | workflow | Survey lifecycle | Draft → Published → Closed → Archived → Draft updates state/version and visible actions | Forbidden/stale transition returns 409 without partial update | pass |
| SURVEYS-WF-002 | workflow | Public response | Start token, validate required answers, advance questions and submit response | Required-answer rejection leaves the response unchanged; start/progress/submit persistence and duplicate-submit guard pass through the public handler; retry matrix remains planned | pass: `surveys_public_response.integration.test.ts` |
| SURVEYS-WF-003 | workflow | Live session | Create/start/advance/end session and preserve participant/session state | Restart/retry does not duplicate session or answers | pass at contract level |
| SURVEYS-WF-004 | integration | Participant invite | Send/resend invite records deterministic audit result | invalid/cancelled recipient and transport failure are explicit | pass at contract level |
| SURVEYS-WF-005 | integration | Durable/external boundary | Timers, mail delivery, callbacks and long-running sessions use Temporal contract when activated | retry, timeout, compensation, replay/restart and shutdown are required | planned |
| SURVEYS-WF-006 | workflow | Live-session current-question results | Host opens results for the current question and sees durable attendee answers | Closed, empty, stale session, and transport-error states do not disclose results | pass at contract level |
| SURVEYS-WF-007 | workflow | Inline question create | Create a question in the parent survey and advance its row version | Blank/type/stale/archive guards leave durable rows unchanged | pass at contract level |
| SURVEYS-WF-008 | recovery | Migration replay | Roll back the idempotency migration and replay the full chain without losing response data | Dependent-index teardown/recreation is explicit and repeatable | pass |
| SURVEYS-WF-009 | participant invitation | New/In Progress to Sent | Send a new invitation and resend an in-progress invitation; completed/stale requests do not mutate | `surveys_participant_invitation.integration.test.ts` plus restart probe | pass |

## Permission and security cases

| Case ID | Actor/scope | Route/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-PERM-001 | Administrator/manager | Definition CRUD, lifecycle, test/live/settings | Allowed and persisted | planned |
| SURVEYS-PERM-002 | Survey User | Read/ordinary write actions | Allowed only for declared `surveys.read/write` operations | planned |
| SURVEYS-PERM-003 | Fleet ordinary user | `/surveys` and direct API | 403 and no data mutation | pass for read boundary; write probe planned |
| SURVEYS-PERM-004 | Public participant | token start/submit/print | Only published token-scoped operations allowed; no admin data leakage | planned |
| SURVEYS-PERM-005 | Invalid/expired token | public endpoints | Stable 401/403/404; no answer or survey disclosure | planned |
| SURVEYS-PERM-006 | Stale/missing record | any mutation | 409/404/422 and unchanged database state | pass at contract level |
| SURVEYS-PERM-007 | Survey Manager/Survey User | Live-session results | Manager may open the host results action; result datasources remain `surveys.read` scoped | direct API permission probe and browser actor matrix | partial |
| SURVEYS-PERM-008 | Survey User | Inline question create | `surveys.write` permits the server-form insert; read-only or absent permission is denied | action contract and mutation guard | pass at contract level |
| SURVEYS-PERM-009 | Administrator/Fleet | Authenticated regression surface | Admin can read the seeded detail; Fleet receives 403 with no survey disclosure | browser actor matrix | pass |
| SURVEYS-PERM-010 | Administrator/Fleet/anonymous | Question mutation and protected catalog | Admin mutation persists; Fleet is denied with 403; anonymous navigation redirects to login | `SURVEYS-ACTOR-MATRIX-001` evidence | pass for Core3; Odoo paired comparison blocked |
| SURVEYS-PERM-011 | Administrator/Fleet/anonymous | Participant invitation actions | Admin can send/resend; invalid state/email/replay are rejected; protected page/API boundaries remain enforced | invitation integration tests and browser evidence | pass for Core3; Odoo action fixture unavailable |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-UI-001 | Survey landing/detail | 1440x900, 390x844 | Menu, cards, stats, form sections, statusbar, labels and overflow match Odoo | partial |
| SURVEYS-UI-002 | Questions/participants/answers | both | List/form/card/detail fields, pagination and readonly semantics match | partial |
| SURVEYS-UI-003 | Public survey | both | Start/question/done screens, required validation, progression and responsive footer match | partial |
| SURVEYS-UI-004 | Analysis/results/print | both | Graph/pivot/report/print controls and empty/error states match | partial |
| SURVEYS-UI-005 | Current route regression | all 14 routes | 28 authenticated checks with no page/request errors, HTTP errors, blank states or overflow | pass |
| SURVEYS-UI-006 | Live-session current-question results | 1440x900, 390x844 | Host results page shows current-question cards/chart/lists without overflow | authenticated paired Odoo/Core3 capture | planned |
| SURVEYS-UI-007 | Survey detail Questions grid | 1440x1000, 390x844 | Add-a-question control, inline row, appended question, and no overflow are visible | authenticated Core3 captures; Odoo fallback limitation recorded | partial |
| SURVEYS-UI-008 | Migration repair smoke | 1440x1000, 390x844 | Existing authenticated Survey detail remains populated and responsive after migration replay | Core3 Admin captures; Odoo installed-reference blocker recorded | partial |
| SURVEYS-UI-009 | Authenticated actor matrix | 1440x1000, 390x844 | Admin question mutation and Fleet/anonymous boundaries are visible without request errors or overflow | `SURVEYS-ACTOR-MATRIX-001` evidence; Odoo fallback | partial |
| SURVEYS-UI-010 | Participant invitation/resend | 1440x1000, 390x844 | Admin send/resend state, count, timestamp, and responsive participant detail are visible without overflow | `SURVEYS-PARTICIPANT-INVITE-001` evidence; Odoo completed-only fixture blocker | partial |

## Exit criteria

- Every current Surveys route/action and public boundary has a planned case.
- Full module sign-off still requires paired Odoo comparison, public-flow
  interaction evidence, mutation actor matrix, and persistence after restart.

## 2026-09-20 actor-matrix execution

`SURVEYS-ACTOR-MATRIX-001` completes the Core3 actor mutation/read boundary
and fresh desktop/mobile probe for the current question workflow. It does not
close the Odoo visual gate: the authenticated reference database redirects
`/odoo/surveys` to Discuss because the Surveys addon is uninstalled.

## 2026-09-20 participant invitation execution

`SURVEYS-PARTICIPANT-INVITE-001` covers the source-backed participant send and
resend lifecycle. Core3 Admin desktop/mobile probes show durable Sent state,
invitation counts, and deterministic timestamps; the focused integration test
also covers permissions, invalid transitions, stale replay, and file-backed
restart persistence. The current authenticated Odoo Participants action has
only Completed fixtures, so its non-completed resend control cannot be paired
live; this remains a conditional evidence limitation rather than a sign-off.
