# Verification

The authenticated Odoo captures `odoo-subtasks-1440x833.png` and
`odoo-subtasks-390x844.png` show the live Project task Sub-tasks tab and Add a
line state. The mobile state has no horizontal overflow.

`core3-project-tasks-1440x833.png` and `core3-project-tasks-390x844.png` show
the authenticated Core3 Project list/detail task table; seeded children
`Prepare migration checklist` and `Record migration evidence` are visible at
both sizes.

Opening a Core3 task was attempted and failed with `Failed to load page / Internal
server error`. The server log identifies the exact blocker as
`Module service is not registered: yaml.service.timesheets` while prefetching
the existing Project task-detail Timesheets datasource in a Project-only
runtime. Shared all-module startup has the independent Employees validation
error `actions[7].fields must be a non-empty array`. Core3 task-detail visual
and CRUD parity is therefore not asserted by this slice.
