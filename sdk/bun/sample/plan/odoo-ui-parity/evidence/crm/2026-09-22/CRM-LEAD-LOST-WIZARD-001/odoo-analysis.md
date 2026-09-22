# Odoo analysis

Reference source: `/home/nhanjs/projects/odoo/addons/crm` (Odoo 19 Community).

- `wizard/crm_lead_lost_views.xml` declares `crm_lead_lost_view_form` for
  `crm.lead.lost`, titled `Lost Lead`.
- The form contains `lost_reason_id` with placeholder `Select a Lost Reason...`,
  `lost_feedback` labelled `Closing Note` with placeholder `What went wrong?`,
  and footer buttons `Mark as Lost` and `Discard`.
- `crm_lead_lost_action` is a modal (`target=new`) bound to `crm.lead` and
  passes the active lead IDs.
- `wizard/crm_lead_lost.py` calls `_track_set_log_message` for a non-empty
  closing note, then calls `action_set_lost(lost_reason_id=...)`.
- `models/crm_lead.py` supplies the durable lost state/reason transition and
  thread tracking. Core3's bounded single-record detail action keeps its
  explicit CRM row-version and permission guards; bulk active-ID wizard
  behavior remains outside this slice.
