# SMS-MAILING-DUPLICATE-001

Bounded Odoo inherited SMS mailing Duplicate action.

- Page/API join: `sms-campaign-detail`
- API action: `duplicate_sms_mailing`
- Migration: `20260922170000-022-sms-mailing-duplicate.yaml`
- Focused test: `test/sms_marketing_mailing_duplicate.integration.test.ts`
- Browser status: blocked by the reference `mass_mailing_sms` installation gate

The action creates a deterministic independent Draft SMS mailing from an
active Sent source, resets delivery/test state, preserves source data, and
requires the SMS write permission and current row version.
