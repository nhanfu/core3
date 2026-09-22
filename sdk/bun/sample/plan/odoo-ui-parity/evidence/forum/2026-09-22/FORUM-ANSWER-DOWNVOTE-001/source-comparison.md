# Source comparison

## Odoo 19

- `addons/website_forum/controllers/website_forum.py:519-524` exposes the
  authenticated JSON-RPC `post_downvote` route for any `forum.post`, including
  answers. It rejects the author's own post and toggles the current user's
  vote direction.
- `addons/website_forum/models/forum_post.py:607-620` stores one vote per
  `(post_id, user_id)`, removes a downvote when repeated, switches an upvote to
  a downvote, and returns the signed aggregate and user vote.
- `addons/website_forum/views/forum_forum_templates_post.xml:360-379`
  renders the vote toolbar for answers, confirming answers are first-class
  voteable posts.

## Core3 bounded implementation

- `pages/question-detail.yaml` adds Downvote/Remove downvote controls to both
  answer action surfaces.
- `api/question-detail.yaml` adds `downvote_forum_answer` with
  `forum.answers.downvote`, `forum.read`, authenticated actor and own-answer
  guards, active/accepted-state validation, parent/answer row-version guards,
  atomic relation replacement, and detail refresh.
- The existing `forum_post_votes` migration provides durable uniqueness and
  restart persistence; no new schema was needed.

Answer favorite, karma/rank effects, public website rendering, and full Forum
sign-off remain separate gaps.
