# Test results — `PURCHASE-RFQ-CONFIRM-001`

- `bun test ./test/purchase.integration.test.ts -t 'confirms eligible RFQs' --timeout 30000` — **PASS**, 1 test / 8 assertions.
- `bun test ./test/purchase.integration.test.ts -t 'replays the Confirm RFQ seed' --timeout 30000` — **PASS**, 1 test / 2 assertions.
- `bun run css:build:purchase` — **PASS**.
- `git diff --check` — **PASS**.
- `bun run audit` — **BLOCKED** by unrelated Activity/CRM/Accounting page/API
  references in the shared checkout; no unrelated files were edited.
- The full `purchase.integration.test.ts` reached 15 passing tests; two later
  discovery checks hit the same unrelated missing `send_lead_email_detail`
  reference and are not claimed green.
