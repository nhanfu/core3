# RECRUITMENT-APPLICANT-INTERVIEW-001

## Source contract

The bounded slice follows Odoo 19 `hr_recruitment` applicant action
`action_create_meeting` in `addons/hr_recruitment/models/hr_applicant.py` and
the applicant form/kanban bindings in `views/hr_applicant_views.xml`. Odoo
opens `calendar.action_calendar_event` with the applicant, applicant name,
default user, and attendee context. Core3 implements the same applicant-bound
Schedule Interview action as a Recruitment-owned YAML server form and durable
meeting datasource.

## Core3 implementation

- Applicant detail exposes `Schedule Interview` and a Meetings x2many grid.
- Meetings persist applicant, company, subject, ISO start/end, location,
  attendees, organizer, and scheduled state.
- The detail summary shows No Meeting, 1 Meeting, Next Meeting, or Last Meeting
  and the meeting date after reload.
- The mutation guards actor, company, active applicant, row version, required
  subject, ISO time ordering, and duplicate scheduling atomically.

## Verification

- Focused test: `test/recruitment_applicant_interview.integration.test.ts`
- BrowserSkill reference attempt: shared tab `1770662590` on instance `245ea108`
  was already borrowed by session `slyk`; no tab was taken over, no independent
  login or Playwright was used, and no visual-parity claim is made.
- BrowserSkill session `hnby` is stopped after the attempt.

## Remaining gaps

This bounded slice does not reproduce Odoo's full Calendar module, partner
record creation, attendee many2many picker, attachment propagation,
recurrence/reminders, meeting edit/cancel flows, calendar route, outbound
notifications, or authenticated desktop/mobile comparison evidence.
