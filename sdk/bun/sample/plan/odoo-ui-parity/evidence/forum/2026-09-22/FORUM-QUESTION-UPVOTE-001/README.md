# FORUM-QUESTION-UPVOTE-001

Bounded feature: authenticated Odoo Forum question upvote toggle.

## Source trace

Odoo 19 `addons/website_forum/controllers/website_forum.py:512-517`
defines `post_upvote`. It rejects the question author, toggles an existing
positive vote off, and delegates persistence/result fields to `forum.post.vote`.
`models/forum_post.py:61-62,193-206,607-615` defines the per-user vote relation,
the current-user vote, aggregate vote count, and toggle behavior.

## Core3 implementation

- `services/forum/pages/question-detail.yaml` remains presentation-only and
  exposes Upvote/Remove upvote controls.
- `services/forum/api/question-detail.yaml` owns `upvote_forum_post`, joined by
  `page.id: forum-question-detail`.
- Migration `20260922140000-011-forum-votes.yaml` adds durable unique
  `(post_id,user_id)` votes.
- `test/forum_question_vote.integration.test.ts` covers page/API contract,
  toggle/count behavior, stale/own-post/archived/actor guards, restart, and the
  authenticated `forum.read` HTTP boundary.

## Browser evidence and blocker

BrowserSkill session was started on shared browser instance `245ea108`.
The authenticated Odoo tab was listed but borrow was denied with the exact
result: `tab is borrowed by another session`, owner session `wabp`.
I did not inspect, navigate, or return that worker's tab, and did not use an
independent login or Playwright. No Odoo live-action screenshot was captured;
no Odoo/Core3 visual-parity claim is made. The existing launcher captures and
the prior `/forum` 404 remain environmental context only: the configured
`core3_reference` database does not have `website_forum` installed.

The BrowserSkill session used for this attempt must be stopped after the work
loop, with the borrowed-tab state left untouched.
