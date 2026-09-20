# Test results

```text
bun test --max-concurrency 1 test/surveys_public_answer_validation.integration.test.ts test/surveys_public_response.integration.test.ts test/surveys_public_next_question.integration.test.ts test/surveys_public_previous_question.integration.test.ts
11 pass, 0 fail, 98 expect() calls

bunx eslint services/surveys/module.ts test/surveys_public_answer_validation.integration.test.ts
pass

bun run audit
UI audit: 688 pages, 697 routes, 1282 datasources

git diff --check
pass
```
