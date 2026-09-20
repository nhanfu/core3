# Test results

```text
bun test --max-concurrency 1 test/surveys_public_live_session.integration.test.ts test/surveys_live_session_join.integration.test.ts test/surveys_live_session_answer.integration.test.ts
7 pass, 0 fail, 64 expect() calls

bunx eslint public/app.ts public/components/PublicLiveSession.ts test/surveys_public_live_session.integration.test.ts
pass

bun run audit
UI audit: 688 pages, 697 routes, 1282 datasources

git diff --check
pass
```
