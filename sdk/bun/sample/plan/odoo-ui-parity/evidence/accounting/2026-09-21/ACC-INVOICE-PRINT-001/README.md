# ACC-INVOICE-PRINT-001 — Invoice Print report

Date: 2026-09-21
Module: Accounting
Feature: bounded invoice Print/report-run contract
Reference: Odoo 19 `account.move.action_print_pdf`

## Evidence index

- [source-comparison.md](source-comparison.md)
- [test-results.md](test-results.md)
- [browser-check.md](browser-check.md)

All screenshots and downloaded files remain outside Git under
`/tmp/core3-odoo-parity/accounting-invoice-print-20260921/`.

## Outcome

The bounded Core3 contract is implemented and its focused persistence/guard
tests pass. Odoo live reference evidence confirms the source-backed action and
real PDF download. Core3 records a durable report run and refreshes history;
binary PDF rendering/download is deliberately not claimed by this slice.

## Scope boundary and blockers

- No other module paths were changed by this feature.
- Core3 browser action requests returned 200, but direct browser reload lost
  the isolated app's in-memory authentication and produced a 401. The
  file-backed DuckDB restart test passed, so browser reload persistence is
  conditional rather than signed off.
- The local Core3 UI required an inspected DOM-click fallback because the
  ordinary bsk click did not dispatch the SPA listener. This is recorded as a
  browser harness limitation; the resulting `/api/mutate` and `/api/query`
  requests were successful.
- Core3 still needs a report renderer/download integration to match Odoo's
  binary `application/pdf` response.
