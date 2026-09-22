# Functionality checklist

| Case | Expected | Result |
| --- | --- | --- |
| Page/API stable join | Detail page and API share `sms-campaign-detail` | pass |
| Sent duplicate | Active Sent source creates a stable Draft copy | pass |
| Copy persistence | Copy survives queries and migration replay; source is unchanged | pass |
| Reset state | Delivery counters, sent date, row version, and test-valid count reset | pass |
| Replay | Second copy gets the next deterministic suffix | pass |
| Guards | Draft, archived, missing, wrong-company, stale, inactive-list, and invalid-content inputs fail without a copy | pass |
| Permission | Action declares `sms_marketing.write` | pass |
| Odoo desktop/mobile | Compare duplicate action/form at 1440x900 and 390x844 | blocked: addon not installed |
