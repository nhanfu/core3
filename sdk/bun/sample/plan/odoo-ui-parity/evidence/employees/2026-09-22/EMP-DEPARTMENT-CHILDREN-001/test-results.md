# Test and build results

Validation completed. The focused test is:

```text
sdk/bun/sample/test/employees_department_children.integration.test.ts
```

Required validation commands:

- focused child-departments integration test: pass, 3 tests / 20 assertions;
- adjacent Employees department regression: pass, 10 tests / 89 assertions;
- Employees YAML/UI audit: pass, 829 pages / 837 routes / 1,728 datasources;
- frontend and CSS build: pass, Vite built 184 modules;
- `git diff --check`: run before commit.

Any unrelated concurrent changes remain outside the feature commit and are not
folded into this feature's result.
