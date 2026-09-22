# Recruitment Add to Pool evidence

Stable ID: `RECRUITMENT-APPLICANT-ADD-TO-POOL-001`
Date: 2026-09-22
Branch: `odoo-test`

This is a bounded functional/source evidence package. It does not claim full
Recruitment completion or Odoo visual parity.

- Odoo source: `addons/hr_recruitment/models/hr_applicant.py::action_talent_pool_add_applicants`, `wizard/talent_pool_add_applicants.py`, and the applicant form/kanban bindings.
- Core3 page/API: `services/recruitment/pages/applicants.yaml` + `api/applicants.yaml`, and `pages/applicant-detail.yaml` + `api/applicant-detail.yaml`, each joined by `page.id`.
- Persistence: migration `20260922250000-025-recruitment-applicant-talent-pool.yaml` adds pool-profile state and applicant-tag relations; membership writes use the existing durable talent-pool relation.
- Browser/reference status: blocked; see `browser-check.md`.
