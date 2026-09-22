# Test results

Focused command from `sdk/bun/sample`:

```text
bun test test/crm_lead_lost_wizard.integration.test.ts
3 pass, 0 fail, 20 expect() calls
```

The focused suite covers source mapping, page/API validation, successful lost
transition, closing-note persistence, file-backed restart, inactive reasons,
stale rows, closed rows, and atomic no-partial-write behavior.

Related CRM command:

```text
bun test test/crm_lead_lost_wizard.integration.test.ts test/crm.integration.test.ts
48 pass, 1 fail, 247 expect() calls
```

The one related failure is the pre-existing CRM AI allowlist invariant for
`crm.lead_mining_requests.create`, `crm.leads.mass_convert`,
`crm.lead_mining_requests.update`, `.submit`, and `.retry`. The allowlist is in
`services/ai`, outside this CRM-only change; no AI file was edited.

Additional gates: `bun run audit` passed with 842 pages, 850 routes, and 1,755
datasources; `bun run frontend:build` passed (Sass plus Vite, 184 modules);
targeted ESLint passed with zero warnings; and `git diff --check` passed at the
verification checkpoint.
