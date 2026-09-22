# Source comparison

| Odoo contract | Previous Core3 state | Bounded Core3 implementation | Classification |
| --- | --- | --- | --- |
| Authenticated `toggle_favourite` route | No favorite relation or action | `toggle_forum_post_favorite` in `api/question-detail.yaml` | missing → implemented |
| Per-user `favourite_ids` | No durable user-scoped state | `forum_post_favorites` with unique `(post_id,user_id)` | missing → implemented |
| `user_favourite` and `favourite_count` | Detail used `SELECT *` and had no values | Detail projection derives both fields from the relation | missing → implemented |
| Active/closed availability | Archived is a Core3 terminal state | State guard allows only `Active`/`Closed` | partial → bounded |
| Odoo follower side effect | Core3 Forum has no follower contract in this slice | Not approximated; recorded as follow-up integration work | missing → deferred |
| Page/API ownership | Existing detail page already presentation-only | API action/datasources remain separate, joined by `page.id` | implemented |
