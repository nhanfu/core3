# Test results

Focused bounded test:

```text
bun test ./test/manufacturing_work_center_workorders.integration.test.ts --timeout 20000
3 pass, 0 fail, 22 expect() calls
```

Related Manufacturing regression tests:

```text
bun test ./test/manufacturing_work_center_workorders.integration.test.ts ./test/manufacturing_work_center_overview.integration.test.ts ./test/manufacturing_workorders.integration.test.ts --timeout 20000
9 pass, 0 fail, 105 expect() calls
```

Additional checks:

- `bun run css:build:manufacturing` — pass.
- `git diff --check` — pass.
- `bun run audit` — blocked before audit output by the unrelated malformed
  `services/surveys/api/survey-detail.yaml`; no Surveys path was changed.
