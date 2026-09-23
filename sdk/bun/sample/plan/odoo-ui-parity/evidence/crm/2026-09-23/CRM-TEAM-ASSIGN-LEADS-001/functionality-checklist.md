# Functionality checklist

- [x] Add `Assign Leads` to the active, lead-enabled Sales Team form header.
- [x] Require the CRM manager permission and preserve the confirmation text.
- [x] Select open, unassigned leads in the selected team only.
- [x] Assign active team members deterministically in round-robin order.
- [x] Convert assigned leads to opportunities and increment row versions.
- [x] Reject missing, archived, or lead-disabled teams without writes.
- [x] Replay the deterministic seed/migration without duplicates.
- [x] Preserve assignments after file-backed database restart.
- [ ] Match Odoo assignment domains, weighted quotas, and cross-team allocation.
- [ ] Match Odoo duplicate merge and team chatter notification.
- [ ] Capture authenticated Odoo/Core3 desktop and mobile evidence.
