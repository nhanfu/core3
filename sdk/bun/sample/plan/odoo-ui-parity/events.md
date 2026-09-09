# Events — sub-plan

Status: `planning`

## Reference

- Odoo addon: `event` (Odoo 19 Community; include visible `event_sale`, `event_crm`, `event_booth` integrations only where present)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: manifest/demo records available; retain demo-enabled and no-demo modes
- Core3 service: `events`

## UI inventory

- Events dashboard, Events, Event Templates/Types, Registrations/Attendees, Booths, and Reporting menus.
- Event list/kanban/calendar with stages, tags, organizer, date/location, tickets, search/filter/group, favorites, pager, publish, duplicate, archive.
- Event form with description, dates, venue, organizer, tickets/prices/limits, questions, slots, registrations, booths, website publication, activities, and chatter.
- Registration/attendee list and form, event type/template form, analysis graph/pivot, portal-facing registration confirmation, mobile cards/calendar, and empty states.

## Core3 backend mock-data plan

Declare `events`, `event_stages`, `event_types`, `event_tags`, `event_tickets`, `event_registrations`, `event_questions`, `event_answers`, `event_slots`, `event_booths`, `event_attendees`, `event_activities`, `event_chatter`, and `event_analysis`. `default` includes stages/types/tags, upcoming/past events, ticket limits/prices, registrations, answers, booths, and reporting rows. States: `upcoming`, `past`, `published`, `empty`, `calendar_month`, `registration_form`, `analysis_graph`, `analysis_pivot`, `mobile`.

## Shared UI primitives

Calendar/list/kanban/form, ticket and registration child grids, date/location fields, publication toggle, portal confirmation, graph/pivot, activities/chatter, search panel, pager, and mobile navigation.

## Screenshots

Capture Odoo/Core3 at 1440x900 and 390x844 for event dashboard/list/kanban/calendar, event form, registrations, tickets/questions, reporting, and portal confirmation/empty states.

## Acceptance criteria

- Event menus, stages/types/tags, ticket and registration workflows, publication, reporting, portal confirmation, and responsive behavior match Odoo.
- Every visible event, child row, question/answer, booth, attendee, activity, chatter item, report value, and empty state is backend YAML mock data.
- Create/edit/save/discard, publish, registration, search/filter/group, calendar, and pager render offline and pass fixture audit.
