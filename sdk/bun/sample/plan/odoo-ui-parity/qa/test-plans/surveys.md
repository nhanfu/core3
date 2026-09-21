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
| SURVEYS-FUNC-013 | public response recovery | Token start/progress/submit across restart | Resume a durable in-progress response after DuckDB reopen and submit/replay exactly once | `surveys_public_response_restart.integration.test.ts` | pass |

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
| SURVEYS-WF-010 | public response | Start → In Progress → Submitted | Public token starts and saves progress, restart resumes it, and submit increments the survey count once | `surveys_public_response_restart.integration.test.ts` | pass |

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
| SURVEYS-PERM-012 | Public token / invalid token | Public response API | Valid survey/answer tokens may read or mutate only the matching in-progress response; wrong survey, stale, and completed tokens disclose no data | public response integration and restart tests | pass for Core3; Odoo host-started flow unavailable |

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
| SURVEYS-UI-011 | Public response start/progress/submitted | 1440x1000, 390x844 | Public respondent can progress and reach the submitted state without overflow | `SURVEYS-PUBLIC-RESPONSE-RESTART-001` evidence; Odoo host-start blocker | partial |

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

## 2026-09-20 public response execution

`SURVEYS-PUBLIC-RESPONSE-RESTART-001` covers the authenticated-browser-visible
Core3 public response lifecycle and the unauthenticated API boundary: start,
progress, restart, submit, and idempotent replay. Odoo is authenticated and
the published token is valid, but the reference answer remains host-controlled
before question rendering; the captured host-start message is the exact paired
comparison blocker. This case is pass for Core3 and partial for paired Odoo
visual/workflow evidence.

## 2026-09-20 results print additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-014 | report/persistence | Authenticated Results → Print | Record a filtered durable print-run row with deterministic survey, response, question, actor, and timestamp fields; refresh result sources | pass |
| SURVEYS-WF-011 | workflow/recovery | Results cohort → Print → restart | Completed + Passed filtering produces the expected cohort count, survives file-backed reopen, and replays without duplicate seed/run rows | pass |
| SURVEYS-PERM-013 | permission/guards | Results Print actor/filter boundary | `surveys.read` is required; missing survey, actor mismatch, invalid status filters, and stale/replayed requests leave the table unchanged | pass |
| SURVEYS-UI-012 | visual/responsive | Results Print desktop/mobile | Authenticated Core3 and Odoo results pages show Print at 1440x1000 and 390x844, intercept one print invocation, and have no horizontal overflow | pass for reachable Odoo 8069; disposable 8072 blocked |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-RESULTS-PRINT-001/`.

## 2026-09-20 live-session leaderboard additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-015 | live-session/report | In-progress host → Leaderboard | Rank durable attendee score rows by score then ID and expose nickname, score, position, and state through the permissioned datasource | pass |
| SURVEYS-WF-012 | workflow/recovery | Leaderboard → close/reopen | Closed and empty sessions return no rows; an in-progress file-backed session preserves ranked rows after reopen and migration replay | pass |
| SURVEYS-PERM-014 | permission/guards | Host action and datasource boundary | `surveys.manage` gates the host navigation, `surveys.read` gates the datasource, and `session_id` plus in-progress state prevent cross-session/closed leakage | pass |
| SURVEYS-UI-013 | visual/responsive | Leaderboard desktop/mobile and Odoo comparison | Authenticated Core3 desktop/mobile show the action and ranked rows without overflow; reachable Odoo is captured with its exact empty-leaderboard blocker | pass for Core3; Odoo conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-LIVE-LEADERBOARD-001/`.

## 2026-09-20 live-session access-code join additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-016 | live-session/public | Valid access code → join/rejoin | In Progress returns current question and the same durable attendee token on normalized-name retry; Ready returns Waiting | pass |
| SURVEYS-WF-013 | workflow/recovery | Join → close/reopen → restart | Closed access is rejected; a file-backed reopen returns the same attendee row/token without duplication; rollback/replay is stable | pass |
| SURVEYS-PERM-015 | permission/guards | Public session-code boundary | `surveys.public` owns the join action; invalid, closed, certification, blank-name, and cross-state requests do not disclose or mutate data | pass |
| SURVEYS-UI-014 | visual/responsive | Session join desktop/mobile + Odoo comparison | Authenticated Core3 1440x1000 and 390x844 show the join flow without overflow; Odoo captures and exact `survey_wrong` blocker are recorded | pass for Core3; Odoo conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-LIVE-SESSION-JOIN-001/`.

## 2026-09-20 live-session attendee-answer additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-017 | live-session/public | Joined attendee → current-question answer | Persist one token-scoped answer, derive deterministic score, and update attendee/session counts | pass |
| SURVEYS-WF-014 | workflow/recovery | Answer → reload/restart → replay | File-backed reopen restores the answer; retry returns the same row without a second insert | pass |
| SURVEYS-PERM-016 | permission/guards | Public answer boundary | Session/attendee/question guards reject closed, missing, empty, invalid, and duplicate writes explicitly | pass |
| SURVEYS-UI-015 | visual/responsive | Answer form desktop/mobile + Odoo comparison | Authenticated Core3 shows `Answered` at 1440x900 and 390x844; exact Odoo missing-session blocker is recorded | pass for Core3; Odoo conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-LIVE-SESSION-ANSWER-001/`.

## 2026-09-20 public retry execution

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-018 | public workflow | Submitted response → Retry | Create one new in-progress response with a deterministic token and preserved respondent/test context | pass |
| SURVEYS-WF-015 | recovery/idempotency | Retry → reopen → replay → submit | Retry row survives file-backed restart; same idempotency key returns the same row; new token submits through the existing public flow | pass |
| SURVEYS-PERM-017 | permission/guards | Public retry boundary | `surveys.public` is declared; wrong token, in-progress source, closed survey, and non-POST requests do not create rows | pass |
| SURVEYS-UI-016 | visual/responsive | Retry start desktop/mobile + Odoo comparison | Core3 authenticated browser renders the new start state at 1440x900 and 390x844; exact Odoo access-error blocker is retained | pass for Core3; Odoo conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PUBLIC-RETRY-001/`.

## 2026-09-20 authenticated test-entry additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-019 | authenticated action | Test Survey → Start Test | Launch the token-scoped deterministic test entry with the source question graph and stable answer token | pass |
| SURVEYS-WF-016 | recovery/idempotency | Start Test → replay → restart | Repeated launch resets one durable test row; file-backed reopen retains its state, token, and launch key | pass |
| SURVEYS-PERM-018 | permission/guards | Test launch boundary | `surveys.write`, non-archived survey/token/question, deterministic entry, and matching launch key are required | pass |
| SURVEYS-UI-017 | visual/responsive | Test entry desktop/mobile + Odoo comparison | Core3 and Odoo authenticated 1440x900 and 390x844 probes render the test-entry landing state without overflow | pass for Core3 and Odoo |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-TEST-ENTRY-001/`.

## 2026-09-20 public next-question additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-020 | public workflow | Start → next question | Seed and advance one ordered durable response cursor through the `surveys.public` API action | pass |
| SURVEYS-WF-017 | recovery/idempotency | Next → restart → replay | File-backed reopen retains the cursor; the same navigation key returns the same question/row without duplication | pass |
| SURVEYS-PERM-019 | permission/guards | Public navigation boundary | Token, in-progress state, expected cursor, ordered-next, final-question, and POST guards reject invalid mutations | pass |
| SURVEYS-UI-018 | responsive/reference | Desktop/mobile next-question probe | Core3 API advancement has zero failed requests and no overflow at 1440x900 and 390x844; renderer and Odoo route blockers are recorded exactly | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PUBLIC-NEXT-QUESTION-001/`.

## 2026-09-20 public next-question renderer binding additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-021 | renderer/API binding | Public renderer → next-question action | The rendered Next control sends the expected cursor/key after saving progress and renders the returned ordered question | pass |
| SURVEYS-WF-018 | restart/idempotency | Rendered next → replay → reload | One navigation key replays safely and a reload restores the durable next cursor | pass |
| SURVEYS-PERM-020 | token/actor guard | Rendered public transition boundary | The renderer remains token-scoped; service stale/closed/wrong-token guards remain authoritative | pass |
| SURVEYS-UI-019 | authenticated responsive/reference | Admin desktop/mobile rendered transition | Question 1 → Question 2, replay, reload, zero request failures, and no overflow at 1440x900/390x844; Odoo fixture blocker recorded | pass for Core3; Odoo conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PUBLIC-NEXT-QUESTION-002/`.

## 2026-09-20 public previous-question additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-022 | public workflow | Question 2 → Back | Persist and render the previous ordered question through the token-scoped API/page binding | pass |
| SURVEYS-WF-019 | restart/idempotency | Back → reopen → replay | File-backed reopen preserves the cursor and the same navigation key replays one response row | pass |
| SURVEYS-PERM-021 | token/actor guard | Previous navigation boundary | Permission, token, stale, closed, invalid-order, non-POST, and first-question guards reject invalid mutations | pass |
| SURVEYS-UI-020 | authenticated responsive/reference | Desktop/mobile previous-question probe | Core3 restores Question 1 after Back/reload at 1440x900 and 390x844; exact Odoo fixture blocker is recorded | pass for Core3; Odoo conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PUBLIC-PREVIOUS-QUESTION-001/`.

## 2026-09-21 public live-session renderer additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-023 | public session/UI | `/s/<session_code>` join and answer | Bind the public route to the durable join/answer APIs and render the current question | pass |
| SURVEYS-WF-020 | restart/idempotency | Join → answer → reload → replay | Preserve attendee token and answer across restart; replay does not add an answer row | pass |
| SURVEYS-PERM-022 | token/state guard | Public session boundary | Existing YAML guards reject closed, invalid, missing-attendee, invalid-answer, and duplicate-answer mutations | pass |
| SURVEYS-UI-021 | authenticated responsive/reference | Core3 desktop/mobile plus Odoo `/s/5822` | Show joined/answered/reloaded state at 1440x900 and 390x844; record exact Odoo connection blocker | pass for Core3; Odoo blocked |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-LIVE-SESSION-001/`.

## 2026-09-21 public answer-validation additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-024 | public question | Invalid Choice/Rating/Numerical value | Return explicit 422 validation without accepting unsupported values | pass |
| SURVEYS-WF-021 | restart/idempotency | Reject → valid progress → restart → submit/replay | Invalid input leaves one unchanged response; valid data survives reopen and replay creates no duplicate row | pass |
| SURVEYS-PERM-023 | token/API guard | Public submit/progress boundary | Validation remains behind the `surveys.public` YAML actions and survey/answer-token scope | pass |
| SURVEYS-UI-022 | authenticated responsive/reference | Desktop/mobile invalid boundary plus valid advance | Core3 observes 422/no mutation and renders Question 2 at 1440x900 and 390x844; Odoo waiting-state limitation is recorded | pass for Core3; Odoo conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-ANSWER-VALIDATION-001/`.

## 2026-09-21 public response deadline additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-025 | public response validity | Expired participant deadline | HTTP 410 with stable code and unchanged response | pass |
| SURVEYS-WF-022 | restart/idempotency | Active deadline restart; expired retry/navigation/progress/submit | Deadline survives reopen; no expired mutation or duplicate retry | pass |
| SURVEYS-PERM-024 | public token/deadline guard | Public response actions | `surveys.public`, token, state, and deadline gates run before mutation | pass |
| SURVEYS-UI-023 | authenticated responsive/reference | Expired public response desktop/mobile | Stable rendered error/no overflow; runtime and Odoo blockers recorded precisely | blocked |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-DEADLINE-001/`.

## 2026-09-21 authenticated live-session previous-question additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-026 | authenticated session workflow | Question 2 → Previous | The host moves the durable live-session cursor to the previous ordered question through the page/API pair | pass |
| SURVEYS-WF-023 | restart/idempotency | Previous → stale replay → restart | The previous cursor survives file-backed reopen; a stale replay returns 409 without a second transition | pass |
| SURVEYS-PERM-025 | permission/state guard | Previous host action boundary | `surveys.manage`, In Progress/current-question, row-version, and first-question guards protect the mutation | pass |
| SURVEYS-UI-024 | authenticated responsive/reference | Host Previous desktop/mobile + Odoo comparison | Core3 probes record the shared page-registry blocker; Odoo records the exact `survey_wrong` session fixture blocker | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-LIVE-SESSION-PREVIOUS-001/`.

## 2026-09-21 public begin additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-027 | public workflow | Existing `New` answer → Begin | Transition one token-scoped response to `In Progress` and set the first ordered question | pass |
| SURVEYS-WF-024 | restart/concurrency | Concurrent Begin → reopen → replay | One durable response/cursor survives file-backed restart; losing writer replays the winner | pass |
| SURVEYS-PERM-026 | token/state/deadline guard | Begin boundary | `surveys.public`, survey/answer token, deadline, first-question, and already-started guards reject invalid transitions | pass |
| SURVEYS-UI-025 | authenticated responsive/reference | Begin desktop/mobile + Odoo comparison | Record exact Core3 route-registration and Odoo host/fixture blockers; no sign-off until both are available | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-BEGIN-001/`.

## 2026-09-21 public section-boundary additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-028 | public question flow | Conditional survey catalog | Section/page rows are not answerable public questions | pass |
| SURVEYS-WF-025 | concurrency/restart | Next over section → concurrent replay → reopen | One durable answerable cursor skips the section and survives restart/idempotent replay | pass |
| SURVEYS-PERM-027 | token/state guard | Section cursor injection | Token-scoped navigation rejects a section cursor without changing response state | pass |
| SURVEYS-UI-026 | authenticated responsive/reference | Conditional public desktop/mobile + Odoo comparison | Capture exact shared-runtime and unavailable-fixture blockers; no sign-off until both are available | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SECTIONS-001/`.

## 2026-09-21 public response cookie resume additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-029 | public workflow | Cookie-selected response GET/start | Read the Odoo-compatible `survey_<survey_token>` cookie and resume the durable token; explicit token wins | pass |
| SURVEYS-WF-026 | concurrency/restart | Cookie start → concurrent replay → reopen | One response/cursor survives concurrent start and file-backed restart; Set-Cookie is deterministic | pass |
| SURVEYS-PERM-028 | token boundary | Stale/malformed cookie and explicit stale token | Ignore stale cookies without disclosure while preserving explicit-token 404 and public permission declarations | pass |
| SURVEYS-UI-027 | authenticated responsive/reference | Admin desktop/mobile plus Odoo comparison | Record exact Core3 route-registry and Odoo host-controlled-fixture blockers; no sign-off until both are available | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-COOKIE-RESUME-001/`.

## 2026-09-21 public response scoring additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-030 | public workflow | Score and pass/fail on submit | Suggested-answer scores persist as a deterministic percentage and Quiz Passed result | pass |
| SURVEYS-WF-027 | concurrency/restart | Concurrent submit → idempotent replay → reopen | One durable result survives the losing DuckDB writer and file-backed restart | pass |
| SURVEYS-PERM-029 | token/state guard | Wrong token and completed response | `surveys.public`, token, In Progress, and submitted-state guards prevent disclosure or mutation | pass |
| SURVEYS-UI-028 | authenticated responsive/reference | Scoring result desktop/mobile + Odoo comparison | Capture exact Core3 route and Odoo installation/reference blockers; no sign-off until available | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SCORING-001/`.

## 2026-09-21 public completion-message additions

| Test ID | Class | Scenario | Expected result | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-FUNC-031 | public workflow | Submit → completion message | Odoo `description_done` copy is returned and rendered after a completed response | pass |
| SURVEYS-WF-028 | concurrency/restart | Concurrent submit → replay → reopen | One durable completion message remains after idempotent replay and restart | pass |
| SURVEYS-PERM-030 | token/state guard | Wrong token and submitted response | `surveys.public`, token, In Progress, and submitted-state guards remain enforced | pass |
| SURVEYS-UI-029 | authenticated responsive/reference | Completion result desktop/mobile + Odoo comparison | Record exact Core3 route and Odoo fixture blockers; no sign-off until available | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-END-MESSAGE-001/`.

## 2026-09-21 public Date question additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-032 | public question | Valid Date answer | Persist an ISO `YYYY-MM-DD` answer through the token-scoped public API | `core3-browser-results.json`, focused test | pass |
| SURVEYS-WF-029 | restart/idempotency | Date progress → reopen → concurrent submit/replay | Preserve the date across DuckDB reopen and create one submitted response row | `test-results.md`, focused test | pass |
| SURVEYS-PERM-031 | token/input guard | Invalid date and wrong token | Return 422/404 before mutation while retaining `surveys.public` action boundaries | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-030 | authenticated responsive/reference | Date question desktop/mobile + Odoo comparison | Capture both viewports and exact shared-runtime/Odoo fixture blockers | `core3-{desktop,mobile}.png`, `odoo-{desktop,mobile}.png` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-DATE-QUESTION-001/`.

## 2026-09-21 public Datetime question additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-033 | public question | Valid Datetime answer | Persist an ISO `YYYY-MM-DD HH:MM:SS` answer through the token-scoped public API | `core3-browser-results.json`, focused test | pass |
| SURVEYS-WF-030 | restart/idempotency | Datetime progress → reopen → concurrent submit/replay | Preserve the value across DuckDB reopen and create one submitted response row | `test-results.md`, focused test | pass |
| SURVEYS-PERM-032 | token/input guard | Invalid datetime and wrong token | Return 422/404 before mutation while retaining `surveys.public` action boundaries | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-031 | authenticated responsive/reference | Datetime question desktop/mobile + Odoo comparison | Capture both viewports and exact shared-runtime/Odoo fixture blockers | `core3-{desktop,mobile}.png`, `odoo-{desktop,mobile}.png` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-DATETIME-QUESTION-001/`.

## 2026-09-21 public Scale question additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-034 | public question | Valid Scale answer | Persist a value in the deterministic 0–10 Scale range through the public API | `core3-browser-results.json`, focused test | pass |
| SURVEYS-WF-031 | restart/idempotency | Scale progress → reopen → concurrent submit/replay | Preserve the value across DuckDB reopen and create one submitted response row | `test-results.md`, focused test | pass |
| SURVEYS-PERM-033 | token/input guard | Out-of-range Scale and wrong token | Return 422/404 before mutation while retaining `surveys.public` action boundaries | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-032 | authenticated responsive/reference | Scale question desktop/mobile + Odoo comparison | Capture both viewports and exact startup/login-fixture blockers | `core3-{desktop,mobile}.png`, `odoo-{desktop,mobile}.png` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SCALE-QUESTION-001/`.

## 2026-09-21 public Matrix question additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-035 | public question | Matrix catalog and answer map | Return deterministic rows/columns and persist a row-to-column answer map | `browser-results.json`, focused test | pass |
| SURVEYS-WF-032 | restart/idempotency | Matrix progress → reopen → concurrent submit/replay | Preserve Matrix JSON across DuckDB reopen and retain one submitted response/idempotency row | `test-results.md`, focused test | pass |
| SURVEYS-PERM-034 | token/input guard | Foreign row/column and wrong token | Return 422/404 before mutation while retaining `surveys.public` boundaries | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-033 | authenticated responsive/reference | Matrix desktop/mobile + Odoo comparison | Capture both viewports and exact Core3/Odoo blockers; no sign-off until available | `core3-{desktop,mobile}.png`, `odoo-{desktop,mobile}.png` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-MATRIX-QUESTION-001/`.

## 2026-09-21 public conditional-question additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-036 | public question | Conditional catalog and trigger relation | Persist the Odoo-style source-answer relation and omit a non-matching follow-up from the public catalog | `source-comparison.md`, focused test | pass |
| SURVEYS-WF-033 | restart/idempotency | Branch → next/previous skip or show → reopen → concurrent submit | Preserve the answer-dependent cursor across restart; replay one durable submit without duplicate response state | `test-results.md`, focused test | pass |
| SURVEYS-PERM-035 | token/input guard | Wrong token and hidden required answer | Keep `surveys.public`, token, state, and visible-question validation boundaries before mutation | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-034 | authenticated responsive/reference | Conditional public desktop/mobile + Odoo comparison | Capture exact Core3 backend and Odoo installed-fixture blockers; no sign-off until both are available | `core3-{desktop,mobile}.png`, `odoo-{desktop,mobile}.png` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-CONDITIONAL-QUESTION-001/`.

## 2026-09-21 public choice-comment additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-037 | public question | Comment settings and prompt | Return durable Odoo comment flags/message through the public question contract | `source-comparison.md`, focused test | pass |
| SURVEYS-WF-034 | restart/idempotency | Comment-only required answer → reopen → concurrent submit | `comment_count_as_answer` permits completion; one durable response and idempotency row survive restart/replay | `test-results.md`, focused test | pass |
| SURVEYS-PERM-036 | token/input guard | Disallowed comment and wrong token | Reject comment data on a question without the source flag and reject wrong answer tokens before mutation | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-035 | authenticated responsive/reference | Choice comment desktop/mobile + Odoo comparison | Capture exact Core3 runtime and Odoo installed-fixture blockers; no sign-off until both are available | `core3-{desktop,mobile}.png`, `odoo-{desktop,mobile}.png` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-COMMENTS-001/`.

## 2026-09-21 respondent identity additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-038 | public identity | Email/nickname question flags | Public question metadata exposes durable `save_as_email` and `save_as_nickname` through the paired YAML/API contract | `source-comparison.md`, focused test | pass |
| SURVEYS-WF-035 | restart/idempotency | Identity progress → reopen → concurrent submit | Derived email/nickname fields survive restart, override spoofed explicit metadata, and converge on one submitted/idempotency row | `verification.md`, focused test | pass |
| SURVEYS-PERM-037 | token guard | Wrong answer token | Public token/state guard returns 404 without mutation | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-036 | authenticated responsive/reference | Identity controls desktop/mobile + Odoo comparison | Admin/public Core3 probes show both controls without overflow; record exact Odoo login/proxy blocker | evidence directory | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-IDENTITY-001/`.

## 2026-09-21 public background additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-039 | public asset | Persisted survey background contract | Return the durable background URL and token-scoped SVG asset through paired page/API YAML | `source-comparison.md`, focused test | pass |
| SURVEYS-WF-036 | restart/replay | Background fetch → reopen → replay | Preserve URL/content across file-backed DuckDB restart and return identical asset bytes | `test-results.md`, focused test | pass |
| SURVEYS-PERM-038 | token/method guard | Malformed, unpublished, foreign, and non-GET asset requests | Reject before returning asset content with 400/404/405 while retaining `surveys.public` metadata | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-037 | authenticated responsive/reference | Public background desktop/mobile + Odoo comparison | Capture computed background and exact Odoo login/proxy blockers; no sign-off until reference is available | `core3-{admin,public}-{desktop,mobile}.png`, `odoo-{desktop,mobile}.png` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-BACKGROUND-001/`.

## 2026-09-21 public suggested-answer image additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-040 | public asset | Choice metadata and image delivery | Return the durable image-answer ID and token-scoped SVG through paired page/API YAML | `source-comparison.md`, focused test | pass |
| SURVEYS-WF-037 | restart/replay | Start → image fetch → reopen → image replay | Preserve the image content across file-backed DuckDB restart and return identical SVG bytes | `test-results.md`, focused test | pass |
| SURVEYS-PERM-039 | token/ownership guard | Wrong answer token, foreign choice/question, and POST | Reject unauthorized or invalid image access with 404/405 while retaining `surveys.public` metadata | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-038 | responsive/reference | Choice image desktop/mobile + Odoo comparison | Capture renderer states and record exact current Odoo blockers | `core3-{admin,public}-{desktop,mobile}.png`, `core3-browser-results.json`, `odoo-{desktop,mobile}.png` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-QUESTION-IMAGE-001/`.

## 2026-09-21 public Numerical question additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-041 | public question | Numerical validation metadata | Return durable validation-required/min/max/message fields through the paired page/API contract | `source-comparison.md`, focused test | pass |
| SURVEYS-WF-038 | restart/idempotency | Invalid → valid decimal → reopen → concurrent submit | Reject invalid values without mutation and converge on one durable submitted response after restart | `test-results.md`, focused test | pass |
| SURVEYS-PERM-040 | token/input guard | Wrong token and invalid numeric input | Retain `surveys.public`, reject malformed/out-of-range values with no mutation, and return 404 for a wrong answer token | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-039 | responsive/reference | Numerical range desktop/mobile + Odoo comparison | Capture Core3 range controls and exact current Odoo login/proxy blockers; no sign-off until reference is available | `core3-{admin,public}-{desktop,mobile}.png`, `odoo-{desktop,mobile}.png` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-NUMERICAL-QUESTION-001/`.

## 2026-09-21 public Char question additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-042 | public question | Char email/length metadata | Return durable email flag, inclusive bounds, and validation message through the paired page/API contract | `source-comparison.md`, focused test | pass |
| SURVEYS-WF-039 | restart/idempotency | Invalid → valid email → reopen → concurrent submit | Reject invalid values without mutation and converge on one durable submitted response after restart | `test-results.md`, focused test | pass |
| SURVEYS-PERM-041 | token/input guard | Wrong token and invalid Char input | Retain `surveys.public`, reject malformed/short values with no mutation, and return 404 for a wrong answer token | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-040 | responsive/reference | Char email desktop/mobile + Odoo comparison | Capture Core3 email control and exact current Odoo login/proxy blockers; no sign-off until reference is available | `core3-{admin,public}-{desktop,mobile}.png`, `odoo-{desktop,mobile}.png` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-CHAR-QUESTION-001/`.

## 2026-09-21 public Text question additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-043 | public question | Text Box metadata and renderer | Return a durable required Text question through the paired page/API contract and render a three-row textarea | `source-comparison.md`, focused test | pass |
| SURVEYS-WF-040 | restart/idempotency | Invalid → missing → multiline text → reopen → concurrent submit | Reject non-scalar/missing values without mutation and converge on one durable submitted response after restart | `test-results.md`, focused test | pass |
| SURVEYS-PERM-042 | token/input guard | Wrong token and malformed Text input | Retain `surveys.public`, reject array-shaped input, and return 404 for a wrong answer token | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-041 | authenticated responsive/reference | Textarea desktop/mobile + Odoo comparison | Record authenticated page binding and exact Core3 service-host/Odoo login/proxy blockers; no sign-off until visual routes are available | `core3-browser-results.json`, `odoo-blocker.json` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-TEXT-QUESTION-001/`.

## 2026-09-21 public Multiple Choice additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-044 | public question | Multiple-choice metadata and controls | Return durable required option metadata through the paired page/API contract and bind the renderer to checkbox controls | `source-comparison.md`, focused test | pass |
| SURVEYS-WF-041 | restart/idempotency | Invalid options → valid multi-select → reopen → concurrent submit | Reject duplicate/foreign options without mutation and converge on one durable submitted response after restart | `test-results.md`, focused test | pass |
| SURVEYS-PERM-043 | token/input guard | Required empty submit and wrong token | Retain `surveys.public`, reject missing required selection, and return 404 for a wrong answer token | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-042 | responsive/reference | Multiple Choice desktop/mobile + Odoo comparison | Record exact Core3 runtime and Odoo login/proxy blockers; no sign-off until both are available | `core3-browser-results.json`, `odoo-blocker.json` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-MULTIPLE-CHOICE-001/`.

## 2026-09-21 live-session question timer additions

| Test ID | Class | Scenario | Expected result | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| SURVEYS-FUNC-045 | live session | Timed question metadata and attendee countdown | Return durable start/limit state through the paired page/API contract and render the timer | `source-comparison.md`, focused test | pass |
| SURVEYS-WF-042 | restart/idempotency | Expired answer → valid answer → reopen → replay | Reject late answer without mutation; preserve one valid answer and replay it after restart | `test-results.md`, focused test | pass |
| SURVEYS-PERM-044 | token/session guard | Wrong attendee/session state and expiry | Keep `surveys.public` and attendee guards ahead of the authoritative expiry guard | `source-comparison.md`, focused test | pass |
| SURVEYS-UI-043 | authenticated responsive/reference | Live timer desktop/mobile + Odoo comparison | Capture both viewports and exact Core3/Odoo blockers; no sign-off until routes are available | `core3-browser-results.json`, `odoo-blocker.json` | conditional |

Execution evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-LIVE-QUESTION-TIMER-001/`.
