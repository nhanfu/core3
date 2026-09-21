# Test results

Focused feature test:

```text
bun test test/livechat_public_message.integration.test.ts --timeout 20000
3 pass, 0 fail, 17 expect() calls
```

Adjacent regression:

```text
bun test test/livechat_public_message.integration.test.ts \
  test/livechat_visitor_feedback.integration.test.ts \
  test/livechat_widget_session.integration.test.ts \
  test/livechat_session_messages.integration.test.ts --timeout 20000
12 pass, 0 fail, 77 expect() calls
```

Full Live Chat corpus:

```text
bun test test/livechat*.integration.test.ts --timeout 20000
82 pass, 0 fail, 803 expect() calls across 24 files
```

Additional checks:

- `bunx eslint test/livechat_public_message.integration.test.ts` — passed.
- `bun run audit` — passed: 808 pages, 817 routes, 1,673 datasources.
- `bun run frontend:build` — passed, including Live Chat Sass and Vite
  production build.
- `git diff --check` — passed.
