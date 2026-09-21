# `SURVEYS-PUBLIC-TOKEN-ACCESS-001` verification

- Focused lifecycle: `bun test test/surveys_public_token_access.integration.test.ts --timeout 30000` — **3 passed, 0 failed, 25 assertions**.
- Public/catalog regression: `bun test ./test/surveys_public*.integration.test.ts ./test/surveys.integration.test.ts --timeout 30000` — **94 passed, 0 failed, 882 assertions across 31 files**.
- Scoped ESLint: `bunx eslint services/surveys/module.ts test/surveys_public_token_access.integration.test.ts test/surveys_public_attempt_limit.integration.test.ts` — **passed**.
- UI audit: `bun run audit` — **727 pages, 736 routes, 1,413 datasources; passed**.
- Scoped `git diff --check` — **passed**.

The focused tests cover YAML page/API identity, `surveys.public` permission,
missing/wrong-token no-disclosure, durable answer-token start, concurrent
replay, file-backed restart, and resumed read. No full-repository regression
or module sign-off is claimed in this bounded wave.
