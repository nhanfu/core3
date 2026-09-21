# Test results

- Focused: `bun test test/crm_lead_attachments.integration.test.ts` from
  `sdk/bun/sample` — **2 passed, 23 assertions**.
- Coverage includes page/API binding, shared client route resolution, migration
  replay, deterministic inline content, upload guards, audit logging,
  protected exact-byte download, datasource forbidden/transport states, and
  file-backed restart persistence.
- Shared DOM probe: `bun test
  packages/client/test/cases/document-components.test.ts` from `sdk/bun`
  could not run in the bare Bun environment because the test file requires its
  browser DOM harness (`document is not defined`). This is an environment
  blocker; no shared component code was changed.
- Broader CRM and repository audit gates remain to be run after final review.
