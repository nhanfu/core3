# Source comparison

| Odoo contract | Previous Core3 state | Bounded implementation |
| --- | --- | --- |
| `post_upvote` authenticated JSON-RPC action | `vote_count` was only a denormalized field; no vote relation/action | `upvote_forum_post` on `forum-question-detail` |
| One vote per `(post,user)`; positive vote toggles off | No durable user vote state | `forum_post_votes` with unique `(post_id,user_id)` |
| `user_vote` and aggregate `vote_count` result fields | Detail had no current-user vote field | Detail projection and mutation result derive `user_vote`; mutation updates aggregate |
| Own-post voting rejected | No actor ownership guard | `FORUM_VOTE_OWN_POST` compares authenticated actor name to question author |
| Odoo active/closed question availability | Core3 had terminal Archived state | Active/Closed allowed; Archived and stale rows rejected |
| Page/view and action ownership | Question detail page already existed | Presentation controls remain in `pages/question-detail.yaml`; API action remains in `api/question-detail.yaml`, joined by `page.id` |

Downvote, karma accounting, and vote notifications remain outside this bounded
stable-ID slice and are not represented as complete Forum parity.
