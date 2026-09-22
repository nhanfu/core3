# Test results

Focused command:

```text
bun test test/surveys_card_results.integration.test.ts --timeout 20000
2 pass, 0 fail, 13 expect() calls
```

Coverage includes page/API IDs, the `surveys.read` boundary, exact action
label and stable route parameter, authenticated results page/API binding,
deterministic Feedback Form result counts, and a filtered passed question
cohort.
