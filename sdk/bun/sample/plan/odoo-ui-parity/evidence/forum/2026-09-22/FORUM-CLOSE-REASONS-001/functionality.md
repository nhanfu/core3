# FORUM-CLOSE-REASONS-001 — functionality evidence

Focused command:

```text
bun test ./test/forum_close_reasons.integration.test.ts
4 pass, 25 assertions, 0 fail
```

The focused suite verifies:

- page/API separation and matching `page.id`;
- 13 deterministic Odoo reasons, name/type search, empty state, and explicit
  transport error;
- create, edit, delete, required-name validation, valid-type validation, and
  stale row-version rejection;
- direct authenticated action enforcement: `forum.read` cannot create and
  `forum.manage` can create;
- migration reapply without duplicate seed rows and persistence after closing
  and reopening a file-backed DuckDB database.

Regression command:

```text
bun test ./test/forum*.integration.test.ts
25 pass, 180 assertions, 0 fail
```

`git diff --check` passed for the Forum implementation and evidence paths.
