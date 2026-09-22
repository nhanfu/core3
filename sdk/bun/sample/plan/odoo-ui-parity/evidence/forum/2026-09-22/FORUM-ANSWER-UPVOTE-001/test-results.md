# FORUM-ANSWER-UPVOTE-001 verification

Focused command:

```text
bun test test/forum_answer_upvote.integration.test.ts
```

The suite covers the page/API discovery join, answer vote projection, toggle/replay, aggregate and row-version updates, own-answer and actor guards, flagged-answer no-write behavior, file-backed restart persistence, and the authenticated `forum.read` HTTP boundary.

Browser visual verification was not completed because the shared Odoo tab required explicit confirmation and the borrow did not complete. No visual-parity claim is made.
