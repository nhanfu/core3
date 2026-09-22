# EMP-EMPLOYEE-BIRTHDAY-GROUP-001

Bounded source-backed Employees parity slice for Odoo's Employees Birthday
group-by. The YAML page/API contracts remain separate and join through
`page.id: employees`. The existing durable birthday field is projected into
the list, optional date column, and pivot field so shared list grouping can
operate on the same source-backed value.

Status: implementation complete; authenticated visual comparison blocked by
the shared-tab borrow conflict documented in `browser-blocker.md`.
