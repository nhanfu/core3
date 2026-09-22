# Source comparison

## Odoo 19

- `/home/nhanjs/projects/odoo/addons/website_forum/controllers/website_forum.py:519-524`
  defines `post_downvote`; it rejects the post owner and calls `post.vote` with
  downvote semantics.
- `/home/nhanjs/projects/odoo/addons/website_forum/models/forum_post.py:191-205`
  derives the user's vote and signed aggregate from `forum.post.vote` rows.
- `/home/nhanjs/projects/odoo/addons/website_forum/models/forum_post_vote.py:12-23,61-98`
  persists one vote per user/post, supports `-1`, and guards own-post and
  karma boundaries.

## Core3 before this slice

`services/forum/api/question-detail.yaml` already projected `user_vote` and
implemented `upvote_forum_post` against the durable `forum_post_votes` table,
whose check constraint already accepted `-1`. The page exposed only Upvote and
Remove upvote. The missing stable action was the downvote route/UI, not a new
table or migration.

## Core3 after this slice

`api/question-detail.yaml` now owns `downvote_forum_post`, joined to the
presentation page by `page.id: forum-question-detail`. The mutation removes,
inserts, or switches the current user's vote and adjusts `vote_count` by -1,
+1, or -2 as appropriate, under row-version and actor guards. The page adds
Downvote and Remove downvote actions. Answer voting and public moderation remain
deferred.
