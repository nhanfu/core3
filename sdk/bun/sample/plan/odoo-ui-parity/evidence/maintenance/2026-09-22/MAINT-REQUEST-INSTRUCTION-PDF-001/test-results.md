# Test results

- Focused: `bun test test/maintenance_request_instructions.integration.test.ts test/maintenance_request_instruction_pdf.integration.test.ts test/maintenance.integration.test.ts` — **14 passed, 0 failed, 148 assertions**.
- Full Maintenance corpus: `bun test test/maintenance*.integration.test.ts` — **64 passed, 0 failed, 527 assertions**.
- Covered: page/API/storage binding, PDF mode selection, upload persistence,
  row-version increment, invalid content, missing/archived/stale guards,
  migration replay, and file-backed restart durability.
