# Recruitment Applicant Applications evidence

Stable ID: `RECRUITMENT-APPLICANT-OPEN-APPLICATIONS-001`
Date: 2026-09-22
Branch: `odoo-test`

This is a bounded functional/source evidence package. It does not claim full
Recruitment completion or Odoo visual parity.

- Odoo source: `addons/hr_recruitment/models/hr_applicant.py::action_open_applications`, `_get_similar_applicants_domain`, and `views/hr_applicant_views.xml`.
- Core3 page/API: `services/recruitment/pages/applicant-applications.yaml` + `api/applicant-applications.yaml`, joined by `page.id` `recruitment-applicant-applications`; the detail stat is bound in `pages/applicant-detail.yaml` + `api/applicant-detail.yaml`.
- Persistence: migration `20260922270000-026-recruitment-applicant-applications.yaml` seeds two fixed same-person applications without changing the existing opening fixtures.
- Verification: see `functionality-checklist.md`, `source-comparison.md`, `gap-matrix.md`, `test-results.md`, and `verification.md`.
- Browser/reference status: blocked by the timed-out authenticated-tab borrow; see `browser-check.md`.
