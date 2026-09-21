# EMP-EMPLOYEE-WORK-CONTACT-SYNC-001 evidence

Odoo source mapping is `hr.employee._inverse_work_contact_details`: when an
employee has one linked work contact, changing Work Email or Work Phone writes
the corresponding contact email and phone. Core3 keeps the API/action and page
contracts separate and joins them through `page.id: employee-detail`.

The authenticated Odoo reference session used `http://localhost:8069`, the
`core3_reference` database, and the supplied `codex@core3.local` QA identity.
The desktop capture is `odoo-desktop.png` at 1916x833; the mobile capture is
`odoo-mobile.png` at 390x844. Both show Abigail Peterson's Work Email and Work
Phone controls. No password, token, or login secret is stored in evidence.

Core3 browser evidence is blocked before page discovery by the unrelated shared
page-schema error `PageSchemaError: actions[7].fields must be a non-empty
array`. The focused integration test still covers source mapping, durable
contact/employee synchronization, actor/company/missing/stale guards, migration
replay, and file-backed restart. No aggregate Employees sign-off is claimed.
