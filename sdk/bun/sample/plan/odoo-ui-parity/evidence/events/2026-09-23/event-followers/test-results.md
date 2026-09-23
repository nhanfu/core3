# Test results

- `bun test ./test/events_followers.integration.test.ts --timeout 20000`: **4 passed, 0 failed, 30 assertions**.
- `bun test ./test/events_followers.integration.test.ts ./test/events.integration.test.ts ./test/events_states.integration.test.ts --timeout 20000`: **13 passed, 0 failed, 137 assertions**.
- `bun run audit`: **866 pages, 874 routes, 1,836 datasources; passed**.
- `git diff --check`: **passed**.

The full Events corpus was run during the checkpoint and reached 128 passing
tests, but two pre-existing inventory assertions required updating for these
two newly declared follower datasources; the focused regression rerun above is
the final result for this change.
