# Source comparison

Odoo 19 source revision: `659759969d535d286b656c96b675e4612b925ddd`.

| Odoo source contract | Core3 implementation | Result |
| --- | --- | --- |
| `action_hr_job_sources`, model `hr.recruitment.source`, `view_mode=list` | `api/opening-trackers.yaml`, `pages/opening-trackers.yaml`, page id `recruitment-job-trackers` | implemented |
| Active job context: `search_default_job_id` and `default_job_id` | `/openings/trackers` receives `opening_id` and `opening_name` from `view_recruitment_opening_trackers` | implemented |
| List fields Campaign, Source, Medium, Email | ListView columns `campaign_name`, `source_name`, `medium_name`, `email` | implemented |
| Search Source and Job | Source search covers source/campaign/medium/email and datasource is constrained by opening ID | bounded adaptation |
| `hr.recruitment.source` officer CRUD | Durable `recruitment_job_trackers` table, writer create/update/delete actions | implemented |
| Generated email alias and inbound mail behavior | Persisted email field only | deferred; no parity claim |
| Separate UTM Source/Medium configuration and applicant propagation | Not touched | deferred; no parity claim |
