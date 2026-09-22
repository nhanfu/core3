# Recruitment Create Employee evidence

Stable ID: `RECRUITMENT-APPLICANT-CREATE-EMPLOYEE-001`
Date: 2026-09-22
Branch: `odoo-test`

This is a bounded functional/source evidence package. It does not claim full
Recruitment completion or Odoo visual parity.

- Odoo source: `addons/hr_recruitment/views/hr_applicant_views.xml` and
  `models/hr_applicant.py::create_employee_from_applicant`.
- Core3 page/API: `services/recruitment/pages/applicant-detail.yaml` and
  `services/recruitment/api/applicant-detail.yaml`, joined by `page.id`.
- Persistence: Recruitment migration `20260922200000-023-recruitment-applicant-employee.yaml`
  adds the nullable applicant employee link; the action writes the existing
  Employees-owned `employees` table.
- Browser/reference status: blocked; see `verification.md`.
- Screenshot status: no desktop or mobile screenshot is claimed because the
  authenticated Odoo tab could not be borrowed.
