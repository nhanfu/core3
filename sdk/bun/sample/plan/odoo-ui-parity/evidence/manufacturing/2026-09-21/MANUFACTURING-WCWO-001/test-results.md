# Test results

Focused bounded test:

```text
bun test ./test/manufacturing_work_center_workorders.integration.test.ts --timeout 20000
4 pass, 0 fail, 24 expect() calls
```

Related Manufacturing regression tests:

```text
bun test ./test/manufacturing_work_center_workorders.integration.test.ts ./test/manufacturing_work_center_overview.integration.test.ts ./test/manufacturing_workorders.integration.test.ts --timeout 20000
11 pass, 0 fail, 108 expect() calls
```

Additional checks:

- `bun run css:build:manufacturing` — pass.
- `git diff --check` — pass.
- `bun run audit` — final rerun passed: 778 pages, 787 routes, and 1,600
  datasources. An earlier run was blocked by the unrelated malformed
  `services/surveys/api/survey-detail.yaml`; no Surveys path was changed by
  this owner.
