# INV-TRANSFER-WAITING-QUEUE-001 verification

- Focused integration test: `bun test --timeout 20000 sdk/bun/sample/test/inventory_transfer_waiting_queue.integration.test.ts`
- Result: PASS — 3 tests / 28 assertions.
- Covered source/action mapping, separate page/API `page.id`, schema validation, durable Waiting rows, search/type/company filters, missing/empty/503 states, refresh history, actor/company/stale guards, permission denial, and file-backed restart persistence.
- Odoo browser evidence: authenticated `core3_reference` desktop and 390x844 mobile captures are `odoo-desktop.png` and `odoo-mobile.png`.
- Core3 browser blocker: global startup discovery stops at unrelated `livechat/pages/channel-detail.yaml` because `actions[7].fields` is empty; see `core3-blocker.json`.
