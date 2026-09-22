# Test results

Focused slice:

```text
bun test ./test/forum_answer_downvote.integration.test.ts --timeout 20000
4 pass, 20 assertions, 0 fail
```

The test covers real page/API discovery, answer downvote toggle/removal,
upvote-to-downvote switching, signed aggregate and parent/answer versions,
stale/own-answer/actor/flagged guards, file-backed restart persistence, and
the authenticated `forum.read` HTTP boundary.

Forum regression:

```text
bun test ./test/forum*.integration.test.ts --timeout 20000
47 pass, 299 assertions, 0 fail
```

Explicit full discovery also confirmed `downvote_forum_answer` is registered
exactly once in the merged `forum-question-detail` action set.
