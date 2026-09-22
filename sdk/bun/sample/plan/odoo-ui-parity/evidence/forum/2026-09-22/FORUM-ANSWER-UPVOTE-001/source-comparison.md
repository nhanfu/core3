# FORUM-ANSWER-UPVOTE-001 source comparison

## Odoo 19 source

- `addons/website_forum/controllers/website_forum.py` exposes the authenticated JSON-RPC `post_upvote` route for a `forum.post`.
- The route toggles the current user's positive vote and rejects a vote on the post author's own record.
- `addons/website_forum/models/forum_post.py` stores one `forum.post.vote` per `(post_id, user_id)` and computes the signed `vote_count` and user-scoped `user_vote`.
- `addons/website_forum/views/forum_post_views.xml` renders answer rows with `vote_count`, confirming answers are first-class forum posts for the vote surface.

## Core3 bounded implementation

- `api/question-detail.yaml` derives answer `vote_count` and `user_vote` from the existing durable `forum_post_votes` relation.
- `upvote_forum_answer` is an authenticated `forum.read` line-item action with parent/answer optimistic concurrency, actor and own-answer guards, active/accepted-state validation, atomic relation toggle, and restart persistence.
- `pages/question-detail.yaml` exposes answer vote fields and Upvote/Remove upvote controls while preserving page/API separation.
- No migration is required: migration `20260922140000-011-forum-votes.yaml` already provides the unique durable relation used by both question and answer posts.

This is intentionally a bounded answer-upvote slice. Answer downvote, answer favorite, karma/rank effects, public website rendering, and full Forum sign-off remain separate gaps.
