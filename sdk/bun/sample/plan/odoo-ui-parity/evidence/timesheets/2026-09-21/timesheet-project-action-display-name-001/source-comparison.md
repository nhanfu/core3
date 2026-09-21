# TIMESHEET-PROJECT-ACTION-DISPLAY-NAME-001

## Source-backed behavior

Odoo `hr_timesheet/models/project_project.py` implements
`action_project_timesheets`. For a standalone project action it changes the
window action display name to `<Project>'s Timesheets`; when the action is
opened from an embedded project action with `from_embedded_action` in the
context, it leaves the generic `Timesheets` label in place.

## Core3 implementation

`services/timesheets/api/project-timesheets.yaml` adds the permission-gated
`project_timesheet_action_context` single datasource. It derives the label
from durable `timesheet_projects`, requires the active current-company,
active, timesheetable project with an analytic account, and selects the
embedded or standalone label from the action context. The API contract is
joined to `pages/project-timesheets.yaml` by `page.id: project-timesheets`;
the page renders the resolved action title through a `StatRow` while keeping
all data and query behavior in the API YAML.

No migration is needed: the label is deterministically computed from the
existing durable project relation. Focused tests cover source mapping,
page/API separation, permission metadata, current-company/active/empty
guards, both label branches, and file-backed restart stability.
