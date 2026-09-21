# INV-TRANSFER-LATE-QUEUE-001 verification

- `bun test --timeout 30000 test/inventory_transfer_late_queue.integration.test.ts` — 3 tests / 30 assertions passed.
- `bunx eslint test/inventory_transfer_late_queue.integration.test.ts` — passed.
- `git diff --check` — passed before commit.
- `bun run audit` — blocked by the unrelated pre-existing malformed `services/surveys/api/survey-detail.yaml` (`YAML Parse error: Unexpected token` during global discovery); no Inventory audit claim is made.
- Core3 authenticated desktop/mobile capture — blocked before HTTP route serving by the same unrelated Surveys discovery error; see `core3-blocker.json`.
- Odoo authenticated desktop/mobile capture — passed against `http://localhost:8069`, database `core3_reference`; see `odoo-browser.json`.
