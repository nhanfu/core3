# Test results

Focused Page Manager regression:

```text
bun test ./test/website_pages.integration.test.ts --timeout 20000
9 pass, 0 fail, 45 assertions
```

The focused assertion covers the new page/API export action binding and
`website.read` permission. Existing Page Manager persistence, publication
workflow, stale replay, empty/search behavior, and restart assertions remain in
the same run.

After that pass, concurrent worktree changes introduced two unrelated schema
errors during a rerun: an unquoted Inventory search placeholder was parsed as
unknown `search.locations` / `search.or` keys, and a concurrent Blog client
action added an unsupported `title` key. Those files were not changed by this
wave and remain preserved; the later aggregate/rerun result is therefore
blocked rather than presented as a Website failure.
