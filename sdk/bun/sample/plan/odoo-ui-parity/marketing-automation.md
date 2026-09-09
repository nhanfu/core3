# Marketing Automation — sub-plan

Status: `planning`

## Reference

- Odoo addon: `marketing_automation` (Odoo 19 Community)
- Source availability: unavailable in the supplied Odoo source; use documented Odoo 19 UI contract
- Odoo demo data: verify manifest/demo records when addon is supplied; provide deterministic campaign and empty modes
- Core3 service: `marketing-automation`

## UI inventory

- Automation dashboard, Campaigns, Campaign Templates, Participants, Reporting, and configuration menus.
- Campaign list/kanban with draft/running/paused/completed states, target model/filter, responsible user, search/filter/group, duplicate/archive, and pager.
- Campaign form with workflow canvas, activity nodes (email/SMS/server action), triggers, delays, domain, participants, counters, start/pause/stop actions, and chatter.
- Participant activity timeline, metrics graph/pivot, node detail dialogs, mobile list/campaign cards, and empty states.

## Core3 backend mock-data plan

Declare `automation_campaigns`, `automation_stages`, `automation_nodes`, `automation_triggers`, `automation_participants`, `automation_activities`, `automation_messages`, `automation_metrics`, and `automation_chatter`. `default` includes campaigns in lifecycle states, workflow nodes/edges, delayed activities, participant timelines, messages, and metrics. States: `running`, `paused`, `completed`, `empty`, `workflow_edit`, `participant_timeline`, `metrics_graph`, `metrics_pivot`, `mobile`.

## Shared UI primitives

Workflow/canvas renderer, node/edge status, list/kanban/form, timeline, domain/filter builder, delay fields, graph/pivot, activity/chatter, action dialogs, and responsive cards.

## Screenshots

Capture the Odoo contract/reference and Core3 at 1440x900 and 390x844 for dashboard, campaign list/form/workflow, participant timeline, reports, and empty state.

## Acceptance criteria

- Campaign menus, workflow topology, node details, lifecycle actions, participant timeline, metrics, and mobile views match Odoo.
- Backend YAML supplies workflow nodes/edges, participants, activities, message metadata, metric values, chatter, and named empty states.
- Start/pause/stop, node detail, search/filter/group, edit/save/discard, and responsive rendering work offline; no records live in page YAML.
