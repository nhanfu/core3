# Test results

- `bun test ./test/accounting_invoice_payment_block.integration.test.ts --timeout 20000`: 2 passed, 23 assertions, 0 failures.
- Focused invoice regression covering attachments, cancel, Pay Now, payment block, PDF, preview, print, reset, reversal, reviewed, send, and payment receipt: 30 passed, 225 assertions; 2 source-mapping tests failed before their assertions during global page discovery because concurrent Fleet YAML declares unsupported `success_message`; their persistence tests passed.
- `git diff --check`: passed before commit.
- `bun run audit`: blocked by the same unrelated Fleet page schema error.
- `bun run frontend:build`: unavailable in this checkout (`Script not found`).
