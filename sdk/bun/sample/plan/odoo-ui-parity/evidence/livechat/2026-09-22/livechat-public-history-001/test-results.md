# Test results

- `bun test test/livechat_history.integration.test.ts --timeout 20000` — **3
  passed, 22 assertions, 0 failed**.
- The focused history suite covers source routes, page/API join, mutation
  guards, empty state, counter preservation, assigned-operator denial, and
  file-backed restart persistence.
- `bun test test/livechat_sessions.integration.test.ts --test-name-pattern
  'keeps session list|seeds populated|keeps workflow|executes the visitor|limits
  assigned|binds the assigned|covers assigned|returns 401' --timeout 20000` —
  **8 passed, 64 assertions, 0 failed; 2 restart tests filtered**.
- The unfiltered Sessions run was attempted; its two restart cases could not
  create DuckDB files because the shared `/tmp` tmpfs was already full. No
  source assertion failed in those cases.
- `bun run audit` — passed: 852 pages, 860 routes, 1,792 datasources.
- `bunx eslint test/livechat_history.integration.test.ts
  test/livechat_sessions.integration.test.ts` — passed with 0 errors and 0
  warnings.
- `git diff --check` — passed.

YAML syntax and page/action joins were validated by the discovery audit. The
YAML-only ESLint invocation was intentionally not used as a quality signal
because this repository's ESLint configuration ignores YAML files.
