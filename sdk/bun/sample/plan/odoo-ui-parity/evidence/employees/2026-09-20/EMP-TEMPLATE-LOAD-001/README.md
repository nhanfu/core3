# EMP-TEMPLATE-LOAD-001

Bounded Employees workflow: Odoo employee Payroll **Load a Template**.

Core3 adds a page/API-separated employee-detail action, an employee-scoped
template datasource, durable employee/version provenance, and guarded atomic
copying. Core3 authenticated browser capture is a precise blocker: the Admin
session is `Core3 Vietnam Branch`, while deterministic Employees fixtures are
`Core3 Vietnam`, so the authenticated list is empty and the detail action
cannot be opened. Odoo is authenticated and captured at both viewports.

Artifacts include Core3 desktop/mobile blocker captures, Odoo detail/Payroll/
modal desktop/mobile captures, and JSON request/assertion records. Captured
2026-09-20. No module sign-off is claimed from this bounded slice.
