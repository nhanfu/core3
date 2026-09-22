# Test results

Focused slice:

```text
bun test ./test/forum_post_comments.integration.test.ts --timeout 30000
4 pass, 29 assertions, 0 fail
```

Coverage includes Odoo source mapping, page/API discovery, deterministic seed
content, question and answer writes, actor/content/state guards, optimistic
versions, migration replay, file-backed restart, and direct `forum.write`
HTTP enforcement.

The earlier focused Forum regression used during development also passed:

```text
bun test ./test/forum_question_downvote.integration.test.ts --timeout 20000
4 pass, 21 assertions, 0 fail
```

Complete Forum corpus after the datasource-join regression updates:

```text
bun test ./test/forum*.integration.test.ts --timeout 30000
51 pass, 328 assertions, 0 fail
```
