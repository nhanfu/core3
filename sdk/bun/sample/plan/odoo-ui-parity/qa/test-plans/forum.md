# Forum detailed QA test plan

Module: forum  
QA owner: forum-qa  
Developer owner: forum module owner  
Reference addon/version: website_forum, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`forum.md`](../../forum.md); executed evidence is recorded
in [`../forum.md`](../forum.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Forums | forum list/detail routes | Forum configuration, active/archived state, ordering and search |
| Posts/questions | post list/detail/public routes | Questions, answers, tags, author, moderation state and content rendering |
| Moderation/configuration | moderation, tags, badges and settings routes when enabled | Edit/close/flag/archive, permissions and validation |
| YAML-driven presentation | page/API fragments and shared HTML components | `page.id` joins, Fluent `html.js` rendering, assets and responsive layout |

Actors are Forum Manager, Moderator, authenticated participant, public visitor,
wrong-company user and unauthenticated user. Fixtures use stable forums,
published/closed posts, authors, tags, answers and moderation events. Public
queries must exclude private/unpublished content; mutations use isolated
databases and deterministic IDs.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| FORUM-FUNC-001 | Forums | List/search/filter, active/archive state and detail navigation use persisted data | pass: focused suite |
| FORUM-FUNC-002 | Posts | Search, detail, author/tag/content projection and empty states are deterministic | pass: focused suite |
| FORUM-FUNC-003 | Post moderation | Create/edit/close/reopen/flag/archive and answer actions validate and persist | planned browser expansion |
| FORUM-FUNC-004 | Taxonomy/configuration | Tags, badges and forum settings support declared CRUD and manager guards | planned |
| FORUM-FUNC-005 | Public visibility | Public visitors see only published forums/posts and no private moderation data | planned browser/public gate |
| FORUM-FUNC-006 | Empty/error/not-found | Empty, missing, forbidden and transport-error states are explicit | pass at contract level |
| FORUM-FUNC-007 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate posts, answers or tags | planned restart/migration gate |
| FORUM-FUNC-008 | Assets/import/export/print | Exercise post images/assets, content import/export and exposed print/share actions | planned browser interaction gate |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| FORUM-WF-001 | Post lifecycle | Draft → Published → Closed/Reopened updates visibility and row version atomically | close/reopen API workflow pass; browser workflow remains planned |
| FORUM-WF-002 | Answer/moderation | Answer, accept, flag and moderation actions preserve author/post relations and audit events | planned |
| FORUM-WF-003 | Forum taxonomy | Tags/badges remain linked to posts and cannot be deleted while referenced | planned |
| FORUM-WF-004 | Website integration | Published content resolves through Website routes with correct site/company scope | planned integration gate |
| FORUM-WF-005 | Durable/external boundary | Notifications, moderation jobs, asset processing and third-party callbacks use Temporal when durable; retry, replay, restart and compensation are tested | planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| FORUM-PERM-001 | Forum Manager/Moderator | Forum and moderation mutations succeed according to role | planned browser actor gate |
| FORUM-PERM-002 | Participant | Allowed posting/answer actions work only within visible forums | planned |
| FORUM-PERM-003 | Public visitor | Only published public content and safe assets are visible | planned |
| FORUM-PERM-004 | Wrong company/site | Other-site forums, drafts and moderation events are not leaked or mutable | planned |
| FORUM-PERM-005 | Unauthenticated/expired | Private routes redirect/401/403 without protected content | planned |
| FORUM-PERM-006 | Stale/missing/invalid | 409/404/422 leaves current forum/post/tag unchanged | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| FORUM-UI-001 | Forum/post list/detail | 1440x900, 390x844 | Menu order, cards, content, tags, actions and responsive layout match Odoo | planned paired capture |
| FORUM-UI-002 | Public question/answers | both | Typography, answer thread, accepted state and public/private visibility match Odoo | planned paired capture |
| FORUM-UI-003 | Moderation/configuration | both | Forms, dialogs, flags, settings and empty states match Odoo | planned |
| FORUM-UI-004 | Current route regression | all manifest-owned Forum routes | Authenticated/public desktop/mobile checks have no blank/redirect, page/request error or overflow | planned |

## Exit criteria

Full Forum sign-off requires the focused suite, authenticated forum/post and
moderation workflows, public/private and actor checks, reload/restart
persistence, Fluent HTML/assets validation, and paired Odoo desktop/mobile
comparisons. Current read-only contract evidence is not module completion.
