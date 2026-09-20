# Comparison and blockers

Core3 follows Odoo's `hr.resume.line` fields and employee-form
`resume_one2many` behavior with section catalogs, date-order validation,
employee-scoped CRUD, and optimistic parent/line concurrency guards.

The authenticated Core3 company switch works but cannot expose the deterministic
Vietnam fixture in the Vietnam Branch session. Odoo authentication and Resume
tab navigation work, but the selected reference employee has no populated
resume-line values for visual field comparison. These are evidence blockers,
not passes. Seven app-icon 404s are unrelated shell noise.
