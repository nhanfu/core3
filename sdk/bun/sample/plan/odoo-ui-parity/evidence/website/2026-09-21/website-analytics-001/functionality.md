# Functionality evidence

Focused command:

```text
bun test ./test/website_analytics.integration.test.ts --timeout 20000
```

Result: 2 tests passed, 17 assertions passed.

Covered:

- presentation/API YAML separation and `page.id` joining;
- `/website-analysis` route and `Website > Reporting > Analytics` menu contract;
- idempotent Website migration replay;
- deterministic Core3 Storefront/Core3 Docs website choices;
- all-site totals: 2 websites, 357 visitors, 480 visits, 1136 page views;
- site-scoped daily traffic rows;
- empty totals/series behavior;
- `website.read` permission and declared 403/503 error states;
- five persisted daily aggregate rows.

`git diff --check` also passed before handoff.
