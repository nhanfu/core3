# Forum detailed QA test plan

Module: forum  
QA owner: forum-qa  
Developer owner: forum module owner  
Reference addon/version: website_forum, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-22

This plan follows [`forum.md`](../../forum.md); executed evidence is recorded
in [`../forum.md`](../forum.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Forums | forum list/detail routes | Forum configuration, active/archived state, ordering and search |
| Forum Tags | forum tag list/form route | Tag list/search, create/edit name/color/forum, uniqueness and post-token refresh |
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
| FORUM-FUNC-009 | Forum Tags CRUD | List/search tags, create/edit name/color/forum, exact post counts, duplicate and required guards | pass: `forum_tags.integration.test.ts` |
| FORUM-FUNC-010 | Post Close Reasons CRUD | List/search Odoo reasons, inline create/edit/delete name/type, required/invalid/stale guards, migration reapply and restart persistence | pass: `forum_close_reasons.integration.test.ts` |
| FORUM-FUNC-011 | Reverse accepted answer | Question-detail answer relation exposes Unaccept, changes Accepted → Active, preserves relations, and survives restart | pass: `forum_answer_moderation.integration.test.ts` |
| FORUM-FUNC-012 | Question favorite toggle | Authenticated user can favorite/unfavorite active or closed questions; count/state persist and stale/archived/actor guards reject safely | pass: `forum_question_favorite.integration.test.ts` |
| FORUM-FUNC-013 | Question upvote toggle | Authenticated user can upvote/un-upvote questions; aggregate/user state persist and stale/archived/own-post/actor guards reject safely | pass: `forum_question_vote.integration.test.ts` |
| FORUM-FUNC-014 | Question downvote toggle | Authenticated user can downvote/remove downvote questions and switch vote direction; signed aggregate/user state persists and stale/archived/own-post/actor guards reject safely | pass: `forum_question_downvote.integration.test.ts` |
| FORUM-FUNC-015 | Post comments | Authenticated user can comment on a question or active/accepted answer; content, actor, target relation, activity timestamp, and reload state persist | pass: `forum_post_comments.integration.test.ts` |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| FORUM-WF-001 | Post lifecycle | Draft → Published → Closed/Reopened updates visibility and row version atomically | close/reopen API workflow pass; browser workflow remains planned |
| FORUM-WF-002 | Answer/moderation | Answer, accept, flag and moderation actions preserve author/post relations and audit events | planned |
| FORUM-WF-003 | Forum taxonomy | Tags/badges remain linked to posts and cannot be deleted while referenced | planned |
| FORUM-WF-004 | Website integration | Published content resolves through Website routes with correct site/company scope | planned integration gate |
| FORUM-WF-005 | Durable/external boundary | Notifications, moderation jobs, asset processing and third-party callbacks use Temporal when durable; retry, replay, restart and compensation are tested | planned |
| FORUM-WF-006 | Tag rename relation | Rename updates the denormalized comma-delimited post token atomically and preserves counts after reload/restart | pass: `forum_tags.integration.test.ts` |
| FORUM-WF-007 | Close reason state contract | Only `basic`/`offensive` reason types persist; stale edits/deletes fail without changing the current row | pass: `forum_close_reasons.integration.test.ts` |
| FORUM-WF-008 | Accepted-answer toggle | Accept then unaccept is atomic; only one accepted answer exists; stale and repeated reverse transitions fail | pass: `forum_answer_moderation.integration.test.ts` |
| FORUM-WF-009 | Question favorite relation | Per-user insert/delete is atomic with the question version; a second user changes the count without changing the first user's state | pass: `forum_question_favorite.integration.test.ts` |
| FORUM-WF-010 | Question upvote relation | Per-user upvote insert/delete is atomic with the question version and survives restart | pass: `forum_question_vote.integration.test.ts` |
| FORUM-WF-011 | Question downvote relation | Per-user downvote insert/delete and upvote conversion are atomic with the question version and survive restart | pass: `forum_question_downvote.integration.test.ts` |
| FORUM-WF-012 | Post comment activity | Question/answer comment insert and parent activity/version updates are atomic; stale or unavailable targets leave no comment row | pass: `forum_post_comments.integration.test.ts` |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| FORUM-PERM-001 | Forum Manager/Moderator | Forum and moderation mutations succeed according to role | planned browser actor gate |
| FORUM-PERM-002 | Participant | Allowed posting/answer actions work only within visible forums | planned |
| FORUM-PERM-003 | Public visitor | Only published public content and safe assets are visible | planned |
| FORUM-PERM-004 | Wrong company/site | Other-site forums, drafts and moderation events are not leaked or mutable | planned |
| FORUM-PERM-005 | Unauthenticated/expired | Private routes redirect/401/403 without protected content | planned |
| FORUM-PERM-006 | Stale/missing/invalid | 409/404/422 leaves current forum/post/tag unchanged | pass at contract level |
| FORUM-PERM-007 | Tag manager boundary | `forum.write` can create/edit; `forum.read` only is denied; invalid/inactive forum and duplicate `(forum_id,name)` are rejected | pass: `forum_tags.integration.test.ts` |
| FORUM-PERM-008 | Close reason manager boundary | `forum.read` can list; only `forum.manage` can create/edit/delete; direct action calls remain forbidden without it | pass: `forum_close_reasons.integration.test.ts` |
| FORUM-PERM-009 | Accepted-answer manager boundary | `forum.manage` is required for accept and unaccept; direct action denial leaves answer/post versions unchanged | pass: `forum_answer_moderation.integration.test.ts` |
| FORUM-PERM-010 | Favorite actor boundary | `forum.read` is required; missing actor, stale row, archived question, and direct denied action leave favorite data unchanged | pass: `forum_question_favorite.integration.test.ts` |
| FORUM-PERM-011 | Upvote actor boundary | `forum.read` is required; missing actor, stale row, archived question, own question, and direct denied action leave vote data unchanged | pass: `forum_question_vote.integration.test.ts` |
| FORUM-PERM-012 | Downvote actor boundary | `forum.read` is required; missing actor, stale row, archived question, own question, and direct denied action leave vote data unchanged | pass: `forum_question_downvote.integration.test.ts` |
| FORUM-PERM-013 | Comment actor boundary | `forum.write` is required; missing actor, blank content, closed/flagged target, stale parent/answer, and direct denied action leave comment data unchanged | pass: `forum_post_comments.integration.test.ts` |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| FORUM-UI-001 | Forum/post list/detail | 1440x900, 390x844 | Menu order, cards, content, tags, actions and responsive layout match Odoo | planned paired capture |
| FORUM-UI-002 | Public question/answers | both | Typography, answer thread, accepted state and public/private visibility match Odoo | planned paired capture |
| FORUM-UI-003 | Moderation/configuration | both | Forms, dialogs, flags, settings and empty states match Odoo | planned |
| FORUM-UI-004 | Current route regression | all manifest-owned Forum routes | Authenticated/public desktop/mobile checks have no blank/redirect, page/request error or overflow | planned |
| FORUM-UI-005 | Tags list/form | 1440x900, 390x844 | Paired Odoo/Core3 captures for list and form; Odoo addon and Core3 runtime must be available | blocked: `FORUM-TAG-001` |
| FORUM-UI-006 | Close Reasons editable list | 1440x900, 390x844 | Odoo list labels/columns and Core3 editable list must be paired when the addon and Core3 runtime are available | blocked: `FORUM-CLOSE-REASONS-001` |
| FORUM-UI-007 | Accepted-answer relation action | 1440x900, 390x844 | Odoo answer accepted state and reverse action paired with Core3 question detail | blocked: `FORUM-ANSWER-UNACCEPT-001` |
| FORUM-UI-008 | Question favorite action | 1440x900, 390x844 | Odoo question favorite control/count paired with Core3 question detail after authenticated toggle/reload | blocked: `FORUM-QUESTION-FAVORITE-001` |
| FORUM-UI-009 | Question upvote action | 1440x900, 390x844 | Odoo upvote control/count paired with Core3 question detail after authenticated toggle/reload | blocked: `FORUM-QUESTION-UPVOTE-001` |
| FORUM-UI-010 | Question downvote action | 1440x900, 390x844 | Odoo downvote control/count paired with Core3 question detail after authenticated toggle/reload | blocked: `FORUM-QUESTION-DOWNVOTE-001` |
| FORUM-UI-011 | Post comment composer/timeline | 1440x900, 390x844 | Odoo question/answer comment composer, author/timestamp/body timeline, and Core3 question-detail/answer actions paired after authenticated submit/reload | blocked: `FORUM-POST-COMMENT-001` |

## Exit criteria

Full Forum sign-off requires the focused suite, authenticated forum/post and
moderation workflows, public/private and actor checks, reload/restart
persistence, Fluent HTML/assets validation, and paired Odoo desktop/mobile
comparisons. Current read-only contract evidence is not module completion.
