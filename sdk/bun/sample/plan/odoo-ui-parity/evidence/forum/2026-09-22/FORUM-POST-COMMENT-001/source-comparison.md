# Source comparison

## Odoo 19

- `addons/website_forum/controllers/website_forum.py:439-451` accepts a
  question or answer post comment, creates a comment `mail.message`, refreshes
  the containing question activity, and redirects to the question.
- `addons/website_forum/models/forum_post.py:52-56` defines
  `last_activity_date` as changing when a reply or comment is added; lines
  `240-263` expose karma-based `can_comment`.
- `addons/website_forum/views/forum_forum_templates_post.xml:522-563` renders
  the composer and comment timeline for each post.

## Core3

- `services/forum/migrations/20260922150000-012-forum-comments-schema.yaml`
  adds `forum_post_comments`, indexes, and `forum_posts.last_activity_at`.
- `services/forum/migrations/20260922150001-013-forum-comments-data.yaml`
  seeds one deterministic comment and backfills its activity timestamp.
- `services/forum/api/question-detail.yaml` exposes the comments datasource,
  `forum.posts.comment` question action, and `forum.answers.comment` answer
  action, with `order_chatter`, `forum.write`, content/target/actor guards,
  optimistic versions, and atomic activity updates.
- `services/forum/pages/question-detail.yaml` binds the existing OdooFormView
  chatter seam and adds Comment controls to both answer action surfaces.

The bounded implementation uses Core3's declared `forum.write` permission in
place of Odoo's dynamic karma thresholds. No Odoo frontend code was copied.
