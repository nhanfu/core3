# Gap matrix

| Gap before change | Evidence | Change | Status |
| --- | --- | --- | --- |
| Campaigns exposed no Retry action for failed SMS | Existing campaign page/API had only send, schedule, cancel, complete | Added `Retry` action with `sms_marketing.write`, state and row-version guards | closed |
| No durable per-recipient SMS trace datasource | Existing report was aggregate-only | Added `sms_delivery_attempts`, deterministic fixtures, list/form API and pages | closed |
| No restart assertion for retry state | Existing lifecycle tests covered aggregate completion only | Added file-backed restart test for campaign and attempt rows | closed |
| Reference SMS form/traces unavailable | `core3_reference` does not install `mass_mailing_sms` | Captured authenticated Apps desktop/mobile blocker; no visual claim | blocked |
| Provider callback and Temporal delivery execution | Odoo source is external `/sms/status` behavior | Kept outside this bounded retry slice and recorded as open | deferred |
