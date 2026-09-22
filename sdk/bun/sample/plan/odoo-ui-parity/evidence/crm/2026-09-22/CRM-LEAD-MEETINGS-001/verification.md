# CRM-LEAD-MEETINGS-001 verification

## Source comparison

- Odoo 19 source: `addons/crm/views/crm_lead_views.xml` defines the
  `action_schedule_meeting` stat button on opportunities and opens
  `crm.act_crm_opportunity_calendar_event_new`, whose `calendar.event` action
  exposes `list,form,calendar` views with `default_opportunity_id`.
- Core3 owns the equivalent durable projection in `crm_meetings`, exposes the
  lead-detail `Meetings` stat, and opens `/crm/lead-meetings` with List and
  Calendar views. The create form preserves the opportunity link, title,
  start/end window, location, attendees, and description.

## Evidence status

- Focused automated evidence: `test/crm_lead_meetings.integration.test.ts`.
- BrowserSkill session `ooib` was stopped after the required 20-second explicit
  borrow confirmation timed out for user tab `1770662590`. No authenticated Odoo
  screenshot or Core3 browser screenshot was captured, and no visual-parity
  claim is made.
- The reference database was not mutated.
