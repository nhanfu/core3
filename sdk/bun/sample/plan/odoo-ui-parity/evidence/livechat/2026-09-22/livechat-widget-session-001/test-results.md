# Test results

Focused command:

```text
bun test test/livechat_widget_session.integration.test.ts --timeout 20000
```

Result: **3 passed, 24 assertions, 0 failed**.

Paired focused regression:

```text
bun test test/livechat_visitor_feedback.integration.test.ts test/livechat_widget_session.integration.test.ts --timeout 20000
```

Result: **6 passed, 44 assertions, 0 failed**.

`bunx eslint test/livechat_widget_session.integration.test.ts` and scoped `git diff --check` passed. The repository-wide discovery audit could not run because an unrelated dirty-worktree `services/blog/api/posts.yaml` fails Bun YAML parsing; this bounded change did not alter or repair that other module.

Authenticated Odoo browser evidence is blocker evidence only: the requested public route returned Error 404 at desktop and mobile viewports. The local Core3 frontend first returned 502 because its backend was unavailable, then the runtime stopped and mobile navigation returned `ERR_CONNECTION_REFUSED`. No visual-parity claim is made.
