# Menu and action inventory

Owning Odoo menu: `Time Off > Management > Time Off`, action
`hr_leave_action_action_approve_department`, with list, kanban, form, calendar,
and activity modes.

Related Odoo form action: `hr.leave.action_approve`, rendered as `Approve` for
the first step and `Validate` for the second step. Odoo source also exposes
`Refuse` and `Cancel` from the pending states.

Core3 surfaces:

- Existing route `/time-off-approval`, API `page.id: time-off-approval`.
- Existing request detail `/time-off/leave-request-detail`, API
  `page.id: leave-request-detail`.
- Existing overview popup `/time-off-overview/detail`, API
  `page.id: time-off-overview-detail`.

All new mutations require `time_off.manage`; read surfaces retain their owning
Time Off permissions. No new top-level menu was invented.
