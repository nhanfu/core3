# Source comparison

Odoo computes `schedule_end` as one hour after `schedule_date` when a request
has a schedule, rejects an end before the start, and computes `duration` in
hours. Its calendar consumes both start and end fields.

Core3 persists `scheduled_end` and `duration` through Maintenance migrations,
returns them from request/detail/calendar/analysis API fragments, computes the
same one-hour default during create/edit mutations, and rejects invalid or
reversed windows. Page YAML exposes the fields and calendar end field while
keeping SQL in the matching API fragments.

The source PDF/Google Slide instruction widgets, full recurrence scheduler,
and whole-module visual parity remain separate gaps.
