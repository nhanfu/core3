# Test results

Focused command from `sdk/bun/sample`:

```text
bun test test/crm_lead_email_composer.integration.test.ts
2 pass, 24 expect calls
```

The focused coverage validates local Odoo source/action mapping, page/API
contracts, migration replay, single and bulk persistence, guard behavior,
activity history, and restart persistence.

Related CRM coverage remained green except for the pre-existing base-module
duplicate `activity_types` discovery failure in the meetings test. The full
CRM suite also reports global AI action/catalog invariant failures, including
this new CRM action and older missing CRM actions. Those global files were not
edited under the module-only scope.

`git diff --check` passed for the CRM implementation, test, plan, and evidence
paths.
