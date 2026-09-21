# Test results

Focused feature:

```text
bun test ./test/website_page_tracking.integration.test.ts --timeout 20000
3 pass, 0 fail, 22 assertions
```

Full Website focused suite:

```text
bun test ./test/website*.integration.test.ts --timeout 20000
27 pass, 0 fail, 145 assertions
```

`git diff --check` passed after the Website-only changes.
