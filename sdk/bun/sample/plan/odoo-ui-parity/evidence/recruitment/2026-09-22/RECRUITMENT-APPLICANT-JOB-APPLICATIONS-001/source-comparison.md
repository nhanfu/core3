# Source comparison

Before this batch, Core3 already had durable talent-pool membership CRUD and
applicant workflow transitions, but no action could copy a pool applicant into
a job-specific application. The applicant schema also made `name` unique,
which prevented Odoo-compatible multiple applications for one candidate.

Changed contracts:

- `services/recruitment/migrations/20260922140000-019-recruitment-applicant-job-applications.yaml`
  rebuilds the development applicant table without the accidental name unique
  constraint, restores the primary key/indexes, and adds `pool_applicant_id`.
- `api/talent-pool-talents.yaml` adds job options, the durable clone mutation,
  guards, result query, and source application count.
- `api/applicant-detail.yaml` exposes pool state/count and the detail wizard.
- `pages/talent-pool-talents.yaml` adds selectable rows, bulk action, and the
  persisted Applications column.
- `pages/applicant-detail.yaml` adds the pool-only header action.
- `test/recruitment_applicant_job_applications.integration.test.ts` covers the
  contract, mutation, guards, restart, and detail stale path.
