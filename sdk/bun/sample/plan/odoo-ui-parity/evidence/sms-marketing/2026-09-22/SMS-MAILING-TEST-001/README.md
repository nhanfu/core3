# SMS-MAILING-TEST-001

Bounded Odoo SMS mailing Test wizard slice.

- Page/API join: `sms-campaign-detail`
- API action: `test_sms_mailing`
- Migration: `20260922160000-021-sms-mailing-test.yaml`
- Focused test: `test/sms_marketing_mailing_test.integration.test.ts`

The action accepts multiline phone numbers, normalizes CRLF input, records
valid and skipped recipients, and persists the deterministic test result under
the mailing row-version guard. Provider transport is intentionally outside this
bounded fixture contract; no real SMS is sent.
