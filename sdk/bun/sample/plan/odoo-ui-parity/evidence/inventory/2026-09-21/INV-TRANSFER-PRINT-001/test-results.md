# INV-TRANSFER-PRINT-001 verification

- Focused feature suite: `bun test test/inventory_transfer_print.integration.test.ts`
  — PASS, 4 tests / 35 assertions.
- Transfer regression suite: `bun test
  test/inventory_transfer_workflow.integration.test.ts` — PASS, 4 tests / 50
  assertions.
- Coverage includes Odoo source markers, page/API separation, Ready Picking
  Operations and Done Delivery Slip report selection, durable print history,
  Ready printed-state persistence, company/actor/state/move-line/row-version
  guards, restart persistence, and read/write permission boundaries.
- Authenticated Core3 browser: desktop 1440x900 and mobile 390x844 both opened
  Ready and Done transfer fixtures, clicked Print, rendered the expected report
  history, recorded no request failures or page errors, and fit document/body
  widths to the viewport. Captures and JSON are in this directory.
- Odoo live probe: HTTP 303 to `/web/login?redirect=%2Fweb%3F`; paired
  authenticated Print/report visual evidence was unavailable and is not claimed.
- YAML/discovery audit: `bun run audit` PASS, 723 pages / 732 routes /
  1,402 datasources.
- Scoped TypeScript lint: PASS (`bunx eslint
  test/inventory_transfer_print.integration.test.ts
  test/inventory_transfer_workflow.integration.test.ts`).
- `git diff --check`: PASS.
