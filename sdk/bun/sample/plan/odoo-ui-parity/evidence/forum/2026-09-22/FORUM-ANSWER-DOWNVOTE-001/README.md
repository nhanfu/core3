# FORUM-ANSWER-DOWNVOTE-001

Bounded YAML-first parity slice for the authenticated Odoo Forum answer
downvote action. The existing durable `forum_post_votes` relation is reused;
no migration is required.

Evidence files:

- [`source-comparison.md`](source-comparison.md)
- [`test-results.md`](test-results.md)
- [`browser-check.md`](browser-check.md)
- [`verification.md`](verification.md)

No visual parity or full Forum sign-off is claimed because the reference
database does not have `website_forum` installed and the shared authenticated
tab could not be borrowed.
