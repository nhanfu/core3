# CRM parity progress

| Field | Value |
| --- | --- |
| Module | `crm` |
| Owning agent | `agent/odoo-crm-wave-20260912` |
| State | `implemented` |
| Current goal | Complete CRM Odoo menu/action parity with durable YAML-first storage, service/API contracts, CRUD, workflows, permissions, browser evidence, and regression coverage. |
| Last commit | pending — CRM AI catalog repair |
| Tester | CRM QA |
| Last verification | 2026-09-13 — bounded candidate QA on isolated DuckDB tests and static gates |
| Open bug IDs | `CRM-FUNC-001`, `CRM-REF-001` |

## Bounded-slice history

| Date | Slice | Commit | Tests/audits | Browser captures | Blocker or next action |
| --- | --- | --- | --- | --- | --- |
| 2026-09-12 | Repair CRM tag catalog contract; add active filtering and row deletion; remove direct CRM SQL reads into isolated Base database for lead create/edit/convert transitions; update focused assertions | `3ad8bbd3b1d6649128a20af8fb41ac668ebe8c1c` | CRM focused suite: 51 pass, 2 fail (AI catalog boundary); `bun run audit`; `bun run lint`; `git diff --check` | `/tmp/core3-odoo-parity-crm-leads-desktop.png`, `/tmp/core3-odoo-parity-crm-leads-mobile.png`, `/tmp/core3-odoo-parity-crm-lead-created-desktop.png`; authenticated admin; Core3 route `/crm/leads` | `CRM-FUNC-001`: blank optional numeric/date form fields produce 500; populated create returned HTTP 200. `CRM-BOUNDARY-001`: contact-create still needs a declared Base create operation/orchestration. `CRM-AI-001`: shared AI allowlist lacks `crm.tags.delete` and cannot be changed in this CRM-only worktree. `CRM-REF-001`: no fresh authenticated Odoo comparison captured in this slice. |
| 2026-09-13 | CRM lead conversion creates the canonical customer through the Base service contract before linking the opportunity | `800384d031d958a041f5688a029d2aab8cde5b88` | Focused: 30 pass/2 fail; related CRM + Base: 62 pass/2 fail; audit/build/lint/diff-check pass; TypeScript unverified | No new browser capture; existing prior captures only | Happy-path Base boundary passes. Remaining blockers: blank optional form normalization (`CRM-FUNC-001`), AI allowlist (`CRM-AI-001`), fresh Odoo/browser evidence (`CRM-REF-001`), and execution-level duplicate/permission/failure atomicity coverage. |
| 2026-09-13 | Register singular CRM tag deletion in the declarative AI allowlist and add contract regression coverage | pending — CRM AI catalog repair | CRM tags: 5 pass/39 assertions; lifecycle named-action allowlist check passes; audit/lint/diff-check pass | No browser capture; declarative catalog/permission repair | `CRM-AI-001` resolved. Full lifecycle still has its pre-existing YAML-context assertion; Base contacts still has its pre-existing `company-northwind` fixture expectation mismatch. |

### Boundary slice evidence (2026-09-13)

- `bun test test/crm.integration.test.ts -t 'converts an unlinked|declares customer creation'` — 2 pass, 6 assertions. The test uses separate CRM and Base DuckDB databases, invokes `yaml.service.base`, verifies the Base row `crm-lead-contact-lead-new-contact`, and verifies CRM linkage/activity persistence.
- The Base contract is `base.contacts.create_from_crm` with `base.contacts.write`, deterministic `id_prefix`, required-name and duplicate-link/email guards. CRM requires both `crm.write` and `base.contacts.write`.

### AI catalog repair evidence (2026-09-13)

- `services/ai/agent.yaml` now explicitly allowlists `crm.tags.delete` at `/api/actions/crm.tags.delete` with `crm.manage`; this matches both CRM tag API fragments and does not grant or alter Base permissions.
- `bun test test/crm_tags_action.integration.test.ts` — 5 pass, 39 assertions. The new regression checks the static AI entry and CRM action binding. The lifecycle allowlist regression also passes.

## Current coverage

- Odoo source inventory checked against `crm_menu_views.xml`, lead, team, and tag view sources.
- Existing Core3 routes cover leads, pipeline, activities, teams, reporting, settings, configuration, tags, stages, recurring plans, and lost reasons.
- Focused functional coverage includes lead conversion, activities, permissions/guards, team routing, reporting, activity plans, tags, stages, recurring plans, lost reasons, and leads analysis.
- The CRM service remains YAML-first; no CRM-specific hand-built HTML renderer was added. Existing UI primitives render through Core3 `html.js`.
- Migration consolidation to exactly `schema.yaml` and `demo.yaml` is not applied because the current migration loader only discovers timestamp/order filenames; changing loader behavior would cross the CRM-only file boundary. Existing development migration history is preserved.
