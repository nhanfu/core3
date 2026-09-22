# Test results

Command:

```text
bun test ./test/chat_mail_messages.integration.test.ts --timeout 20000
```

Result:

```text
3 pass
0 fail
19 expect() calls
```

The suite covers action/menu and route discovery, page/API `page.id` joins, idempotent migration replay, searchable list/detail data, empty and missing-record states, and the `chat.technical` boundary.

Additional checks:

- `git diff --check` passed.
- `bun run audit` was attempted but stopped on unrelated pre-existing dirty-worktree schema errors in Live Chat (`wait_livechat_session_detail` references and unsupported `server` page components). No Chat-specific audit error was reported before that blocker, and the focused discovery test passed.
