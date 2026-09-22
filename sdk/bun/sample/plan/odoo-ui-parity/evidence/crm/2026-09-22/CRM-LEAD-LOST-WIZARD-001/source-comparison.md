# Source comparison

| Odoo contract | Core3 implementation | Result |
| --- | --- | --- |
| `crm.lead.lost` modal title `Lost Lead` | `mark_lead_lost_detail` server form title | Implemented |
| Lost reason selector | `lost_reason` select from `crm_lost_reason_lookup_detail` | Implemented |
| Optional `Closing Note` / `What went wrong?` | `lost_feedback` textarea on the `lead-detail` API fragment | Implemented |
| `Mark as Lost` / `Discard` footer | `submit_label` / `cancel_label` | Implemented |
| Apply reason and close the lead | `crm_leads` workflow transition with active-reason guard | Implemented |
| Record non-empty closing note in chatter | Atomic `crm_activity_log` `crm.note` row with `Lost Comment:` detail | Implemented |
| Active-ID multi-record wizard | Core3 single-record detail action | Open, bounded scope |
| Authenticated desktop/mobile visual comparison | BrowserSkill borrow of existing Odoo tab | Blocked; no visual claim |
