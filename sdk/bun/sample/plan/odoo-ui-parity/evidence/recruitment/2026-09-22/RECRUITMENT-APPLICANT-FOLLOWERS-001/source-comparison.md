# Source comparison

| Odoo contract | Previous Core3 state | Batch 14 implementation | Result |
| --- | --- | --- | --- |
| List/kanban bound `Add/Remove Followers` action | No follower action | Applicants bulk server form | implemented |
| Add/Remove radio and multi-contact selector | No follower state or contacts | YAML radio + multi-select options datasource | implemented |
| Selected applicant ids | No bulk follower mutation | `selectedIds` guarded, multi-applicant SQL | implemented |
| Subscribe/unsubscribe | No durable subscriptions | `recruitment_applicant_followers` table, idempotent add/remove | implemented |
| Notify + extra comments | No notification contract | Durable follower event audit with notify/message | bounded adaptation |
| Source mail followers/partner model | No mail-module ownership in Recruitment | Service-owned seeded contact directory | deliberate bounded adaptation |
| Chatter/follower visual widget | Applicant detail had no follower state | Read-only count/names group on detail | implemented for bounded slice |
| External invitation/email delivery | Not present | Not included | explicit gap |
