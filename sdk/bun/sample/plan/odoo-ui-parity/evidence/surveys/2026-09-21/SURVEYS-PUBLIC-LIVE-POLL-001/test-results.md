# SURVEYS-PUBLIC-LIVE-POLL-001 verification

Date: 2026-09-21

## Focused

`bun test test/surveys_public_live_poll.integration.test.ts`

- 2 passed, 0 failed
- 20 assertions
- Covers page/API pairing, token-required polling, method guard, foreign-token
  denial, durable row-version revision change after the host changes question,
  concurrent poll convergence, and file-backed restart.

## Adjacent live-session regression

`bun test test/surveys_public_live_poll.integration.test.ts test/surveys_live_session_join.integration.test.ts test/surveys_live_session_answer.integration.test.ts test/surveys_live_results.integration.test.ts`

- 10 passed, 0 failed
- 93 assertions

## Static checks

- `bun run audit`: pass — 737 pages, 746 routes, 1,450 datasources.
- `bunx eslint public/components/PublicLiveSession.ts services/surveys/module.ts test/surveys_public_live_poll.integration.test.ts`: pass.
- `git diff --check` on the Surveys slice: pass.
