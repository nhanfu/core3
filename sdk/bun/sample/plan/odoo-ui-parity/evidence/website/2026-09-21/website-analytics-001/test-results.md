# Test results

| Check | Result |
| --- | --- |
| `bun test ./test/website_analytics.integration.test.ts --timeout 20000` | pass — 2 tests, 17 assertions |
| `git diff --check` | pass |
| Website migration replay | pass in focused test |
| Whole Core3 startup | blocked by unrelated CRM page/API discovery mismatch |

The full existing Website test set was not used as a sign-off gate because
whole-repository discovery currently fails on unrelated dirty Fleet/CRM changes;
the new test isolates a temporary copy of only the Website module for discovery
and runs the real Website migrations/database against DuckDB memory.
