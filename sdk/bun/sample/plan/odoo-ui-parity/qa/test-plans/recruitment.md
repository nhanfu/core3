# Recruitment detailed QA test plan

Module: recruitment  
QA owner: recruitment-qa  
Developer owner: recruitment module owner  
Reference addon/version: hr_recruitment, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-22

This plan follows [`recruitment.md`](../../recruitment.md); executed evidence
is recorded in [`../recruitment.md`](../recruitment.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Applicants | `/recruitment/applicants`, `/recruitment/applicants/detail` | Search/filter, applicant CRUD, activities, stage transitions and hiring data |
| Job positions and reporting | `/recruitment/openings`, `/openings/interviewer`, `/openings/interviewer/detail`, `/recruitment/recruitment-analysis` | Position CRUD, interviewer-scoped read-only action, published/open state, grouped analysis and empty/error states |
| Configuration | `/recruitment/contract-types`, `/recruitment/degrees`, `/recruitment/emails`, `/recruitment/refuse-reasons`, `/recruitment/settings`, `/recruitment/stages`, `/recruitment/stages/detail`, `/recruitment/tags`, `/recruitment/activity-types`, `/recruitment/activity-plans` | Catalog CRUD, archive/restore, validation, activity configuration, and manager-only settings |
| Talent pools | `/recruitment/talent-pools`, `/recruitment/talent-pools/detail`, `/recruitment/talent-pools/talents` | Pool CRUD, talent membership, scoped reads and removal |

The authenticated topology is the Recruitment module process. Actors are
Recruitment Manager, Recruitment User, Fleet ordinary user, wrong-company
user and unauthenticated user. Fixtures use stable openings, applicants,
stages, tags, catalogs and talent pools; tests must use generated IDs for
mutations and clean them up or isolate their database.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| RECRUITMENT-FUNC-001 | Applicants | List/detail search, filter, sort, pagination and valid-record navigation work | pass: focused suite |
| RECRUITMENT-FUNC-002 | Applicant CRUD | Create, edit, archive/refuse and delete enforce validation, version checks and reload persistence | planned browser mutation gate |
| RECRUITMENT-FUNC-003 | Job positions | Create/edit/open/close position and preserve values after reload | planned browser mutation gate |
| RECRUITMENT-FUNC-004 | Catalog/configuration | Contract types, degrees, emails, refuse reasons, stages, tags and settings support declared CRUD/guards | pass at contract level; browser CRUD planned |
| RECRUITMENT-FUNC-005 | Talent pools | Create/edit pool, add/remove talents and preserve membership after reload | planned browser mutation gate |
| RECRUITMENT-FUNC-006 | Analysis/activity | Analysis and applicant activity surfaces use scoped real fixture data | pass at contract level |
| RECRUITMENT-FUNC-007 | Empty/error/not-found | Missing, forbidden, empty and transport-error states are deterministic and leak no data | pass at contract level; browser boundary planned |
| RECRUITMENT-FUNC-008 | Migrations/seeds | Reapply schema/demo fixtures without duplicate business rows or moving dates | planned migration gate |
| RECRUITMENT-FUNC-009 | Import/export/attachments | Exercise exposed applicant file, attachment, import/export and print actions | planned browser interaction gate |
| RECRUITMENT-FUNC-010 | Activity Plans | Create, edit, search, archive/restore, delete, validate model/step shape, and reload ordered activity steps | pass: focused Activity Plans suite; Odoo browser blocked |
| RECRUITMENT-FUNC-011 | Applicant email | Bulk composer validates recipients/templates/content, persists one sent audit row per applicant, and survives restart | pass: focused applicant email suite; Odoo browser blocked |
| RECRUITMENT-FUNC-012 | Applicant followers | Bulk Add/Remove Followers validates active contacts, persists subscriptions and notification audit, and survives restart | pass: focused applicant followers suite; Odoo browser blocked |
| RECRUITMENT-FUNC-013 | Interviewer job positions | Assigned interviewer sees only durable same-company positions in Kanban and read-only form; no create action is exposed | pass: focused interviewer suite; Odoo browser blocked |
| RECRUITMENT-FUNC-014 | Applicant Create Employee | Current hired applicant creates one linked durable employee; repeated, stale, wrong-company and not-ready requests do not create partial rows; restart preserves the link | pass: focused Create Employee suite; Odoo browser blocked |

## Workflow and integration cases

| Case ID | Workflow | Expected result | Status |
| --- | --- | --- | --- |
| RECRUITMENT-WF-001 | Applicant hiring lifecycle | New → Screening → Interview → Offer → Hired updates the row and version atomically; invalid transitions return 409 | pass: authenticated workflow probe |
| RECRUITMENT-WF-002 | Refuse/reopen | Refuse records reason and blocks invalid hiring actions; reopen restores the valid path | refusal and reopen persistence, invalid-input, and stale-replay contract pass; browser gate planned |
| RECRUITMENT-WF-003 | Applicant/job-position link | Applicant remains scoped to its position and position counters reflect applicant changes | planned integration gate |
| RECRUITMENT-WF-004 | Activities and notifications | Scheduled/completed activities remain linked to applicant and retry safely | planned |
| RECRUITMENT-WF-005 | Durable/external boundary | Mail, timers, callbacks and cross-module hiring workflows use Temporal with retry, replay, restart and compensation coverage | planned |
| RECRUITMENT-WF-006 | Applicant email send | Selected applicants produce durable sent-message audit rows atomically; invalid recipient/template/company/actor inputs produce no partial writes | pass: focused integration; external mail delivery remains out of scope |
| RECRUITMENT-WF-007 | Applicant follower edit | Selected applicants add/remove contacts idempotently; notify/comments are audited only for Add and invalid inputs leave subscriptions unchanged | pass: focused integration; external invitation delivery remains out of scope |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| RECRUITMENT-PERM-001 | Recruitment Manager | Full configuration and applicant/job-position mutations allowed | planned |
| RECRUITMENT-PERM-002 | Recruitment User | Ordinary reads and permitted applicant actions work within scope | planned |
| RECRUITMENT-PERM-003 | Fleet ordinary user | Recruitment settings/direct protected actions return 403 and do not change data | pass: settings boundary |
| RECRUITMENT-PERM-004 | Wrong company | No applicant, position or talent-pool leakage or update | planned |
| RECRUITMENT-PERM-005 | Unauthenticated/expired | Redirect/401/403 without protected data in the response | planned |
| RECRUITMENT-PERM-006 | Stale/missing input | 409/404/422 responses leave the current row unchanged | pass at contract level |
| RECRUITMENT-PERM-007 | Activity Plans manager boundary | Manager mutations work; non-manager/anonymous access is rejected without data | pass: contract declaration; live actor/browser gate pending |
| RECRUITMENT-PERM-008 | Applicant email actor/company boundary | Recruitment write actor can send only selected same-company applicants with recipient email; actor/company/recipient violations are rejected atomically | pass: focused integration; live actor/browser gate pending |
| RECRUITMENT-PERM-009 | Applicant follower actor/company/contact boundary | Recruitment write actor can manage only selected same-company applicants and active contacts; invalid contact/company/notify requests are rejected atomically | pass: focused integration; live actor/browser gate pending |
| RECRUITMENT-PERM-010 | Interviewer job-position boundary | Assigned interviewer can read assigned same-company positions; unassigned, wrong-company, and direct detail access return no record; mutations are absent | pass: focused interviewer suite; live actor/browser gate pending |
| RECRUITMENT-PERM-011 | Applicant Create Employee boundary | Only an authenticated Employees writer can convert a same-company current hired applicant; anonymous, wrong-company, duplicate and stale requests are rejected atomically | pass: focused Create Employee suite; live actor/browser gate pending |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| RECRUITMENT-UI-001 | Applicants/openings | 1440x900, 390x844 | Menus, list/kanban/detail labels, actions and responsive layout match Odoo | partial |
| RECRUITMENT-UI-002 | Applicant lifecycle/detail | both | Stage/status actions, forms, activities and refusal states match Odoo | partial |
| RECRUITMENT-UI-003 | Configuration/talent pools/analysis | both | Catalog forms, analysis, pool membership and permission states match Odoo | partial |
| RECRUITMENT-UI-004 | Current route regression | all 15 unique registered routes | 30 authenticated desktop/mobile checks have no blank/redirect, page/request error or overflow | pass |
| RECRUITMENT-UI-005 | Activity Plans list/form | 1440x900, 390x844 | Recruitment Plans menu, List/Kanban tabs, empty/form labels and responsive state match Odoo | blocked: live reference has no Recruitment action |
| RECRUITMENT-UI-006 | Applicant email composer | 1440x900, 390x844 | Applicant list bulk Send Email opens composer with subject/body/template/attachment controls and sends selected applicants | partial: authenticated Core3 desktop capture; mobile and paired Odoo blocked |
| RECRUITMENT-UI-007 | Applicant follower wizard | 1440x900, 390x844 | Applicant list bulk Add/Remove Followers opens source-shaped modal, updates selected records, and detail shows persisted followers | partial: source-backed Core3 contract; live Odoo and Core3 runtime capture blocked/pending |
| RECRUITMENT-UI-008 | Interviewer Job Positions | 1440x900, 390x844 | Recruitment Applications → By Job Positions exposes Kanban/form only, no create control, assigned-row filtering, and responsive read-only detail | blocked: authenticated Odoo tab borrow is owned by another team session |
| RECRUITMENT-UI-009 | Applicant Create Employee | 1440x900, 390x844 | Hired applicant detail exposes Create Employee, then Employee navigation and persisted employee summary | blocked: authenticated Odoo tab borrow is owned by another team session; no visual-parity claim |

## Exit criteria

Full Recruitment sign-off requires the focused functional suite, authenticated
CRUD and workflow probes, manager/user/wrong-company/unauthenticated checks,
reload and restart persistence, and paired Odoo desktop/mobile comparisons.
The current route matrix and one settings permission boundary are progress
evidence only, not module completion.
