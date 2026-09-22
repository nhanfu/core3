# Test results

- `bun test ./test/forum_question_downvote.integration.test.ts --timeout 20000`
  — 4 passed, 21 assertions.
- The focused suite covers contract discovery, signed toggle/conversion,
  stale/actor/state guards, HTTP permission enforcement, and restart durability.
- `bun test ./test/forum*.integration.test.ts --timeout 20000` — 39 passed,
  257 assertions.
- `bun run css:build:forum` — passed.
- `bun run frontend:build` — passed.
- `git diff --check` — passed before staging.
