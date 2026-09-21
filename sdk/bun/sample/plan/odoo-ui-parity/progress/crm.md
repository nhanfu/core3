# CRM parity progress

| Field | Value |
| --- | --- |
| Module | `crm` |
| Owning agent | `agent/odoo-crm-wave-20260912` |
| State | `implemented` |
| Current goal | Complete CRM Odoo menu/action parity with durable YAML-first storage, service/API contracts, CRUD, workflows, permissions, browser evidence, and regression coverage. |
| Last commit | `b70a3930c7ab0e3c8052f51a8d413ff50b0f8854` (candidate; QA ledger pending) |
| Tester | CRM QA |
| Last verification | 2026-09-13 — CRM QA retest: focused tag/allowlist pass; broader catalog-context failure reproduced; browser retest unavailable |
| Open bug IDs | `CRM-FUNC-001`, `CRM-REF-001` |

## Bounded-slice history

| Date | Slice | Commit | Tests/audits | Browser captures | Blocker or next action |
| --- | --- | --- | --- | --- | --- |
| 2026-09-12 | Repair CRM tag catalog contract; add active filtering and row deletion; remove direct CRM SQL reads into isolated Base database for lead create/edit/convert transitions; update focused assertions | `3ad8bbd3b1d6649128a20af8fb41ac668ebe8c1c` | CRM focused suite: 51 pass, 2 fail (AI catalog boundary); `bun run audit`; `bun run lint`; `git diff --check` | `/tmp/core3-odoo-parity-crm-leads-desktop.png`, `/tmp/core3-odoo-parity-crm-leads-mobile.png`, `/tmp/core3-odoo-parity-crm-lead-created-desktop.png`; authenticated admin; Core3 route `/crm/leads` | `CRM-FUNC-001`: blank optional numeric/date form fields produce 500; populated create returned HTTP 200. `CRM-BOUNDARY-001`: contact-create still needs a declared Base create operation/orchestration. `CRM-AI-001`: shared AI allowlist lacks `crm.tags.delete` and cannot be changed in this CRM-only worktree. `CRM-REF-001`: no fresh authenticated Odoo comparison captured in this slice. |
| 2026-09-13 | CRM lead conversion creates the canonical customer through the Base service contract before linking the opportunity | `800384d031d958a041f5688a029d2aab8cde5b88` | Focused: 30 pass/2 fail; related CRM + Base: 62 pass/2 fail; audit/build/lint/diff-check pass; TypeScript unverified | No new browser capture; existing prior captures only | Happy-path Base boundary passes. Remaining blockers: blank optional form normalization (`CRM-FUNC-001`), AI allowlist (`CRM-AI-001`), fresh Odoo/browser evidence (`CRM-REF-001`), and execution-level duplicate/permission/failure atomicity coverage. |
| 2026-09-13 | Register singular CRM tag deletion in the declarative AI allowlist and add contract regression coverage | pending — CRM AI catalog repair | CRM tags: 5 pass/39 assertions; lifecycle named-action allowlist check passes; audit/lint/diff-check pass | No browser capture; declarative catalog/permission repair | `CRM-AI-001` resolved. Full lifecycle still has its pre-existing YAML-context assertion; Base contacts still has its pre-existing `company-northwind` fixture expectation mismatch. |
| 2026-09-13 | QA retest of singular CRM tag deletion allowlist repair | `b70a3930` + QA ledger commit | Focused tags: 5 pass/39 assertions; named-action regression: 1 pass; audit and diff-check pass; targeted ESLint pass; broader CRM/Base run stopped after reproducing YAML-context failure | Unauthenticated redirect only: `/tmp/core3-crm-retest-desktop-unauth.png`; authenticated desktop/mobile probe stopped before captures; no fresh Odoo | Repair-specific `CRM-AI-001` evidence passes. Do not aggregate/sign off: broader AI YAML context remains failing, complete related count and authenticated/Odoo evidence remain unavailable. |
| 2026-09-22 | Lead detail attachment upload/download/preview contract and durable fixture (`CRM-LEAD-ATTACHMENTS-001`) | pending | Focused attachment suite: 2 pass / 23 assertions; diff-check and scoped ESLint pending final gate | No captures: BrowserSkill borrow confirmation timed out on browser `245ea108`; no visual parity claim | Download path mismatch repaired, CRM lead/size/name guards added, inline fixture and restart proof added; audit/full CRM/browser/Odoo visual gates remain open |

### Boundary slice evidence (2026-09-13)

- `bun test test/crm.integration.test.ts -t 'converts an unlinked|declares customer creation'` — 2 pass, 6 assertions. The test uses separate CRM and Base DuckDB databases, invokes `yaml.service.base`, verifies the Base row `crm-lead-contact-lead-new-contact`, and verifies CRM linkage/activity persistence.
- The Base contract is `base.contacts.create_from_crm` with `base.contacts.write`, deterministic `id_prefix`, required-name and duplicate-link/email guards. CRM requires both `crm.write` and `base.contacts.write`.

### QA retest evidence (2026-09-13)

- `services/ai/agent.yaml` contains singular `crm.tags.delete` at `/api/actions/crm.tags.delete` with POST and `crm.manage`; `api/tag-detail.yaml` binds `delete_crm_tag_detail` to the same action and permission. Focused `crm_tags_action.integration.test.ts`: 5 pass, 39 assertions.
- `crm.integration.test.ts -t 'keeps every declared CRM named action'`: 1 pass. The broader catalog-context assertion still fails at `test/crm.integration.test.ts:552`; no product change was made during QA.
- `bun run audit`: pass, 647 pages / 662 routes / 1112 datasources. `bunx eslint sample/test/crm_tags_action.integration.test.ts`: pass. `git diff --check`: pass. Full repository lint was attempted from `sdk/bun` but stopped as a bounded probe; `sample` has no lint script.
- Browser: runtime started on 4012/4013, unauthenticated redirect verified, authenticated desktop/mobile probe stopped before results; no fresh Odoo evidence.

### AI catalog repair evidence (2026-09-13)

- `services/ai/agent.yaml` now explicitly allowlists `crm.tags.delete` at `/api/actions/crm.tags.delete` with `crm.manage`; this matches both CRM tag API fragments and does not grant or alter Base permissions.
- `bun test test/crm_tags_action.integration.test.ts` — 5 pass, 39 assertions. The new regression checks the static AI entry and CRM action binding. The lifecycle allowlist regression also passes.

### 2026-09-22 — CRM-LEAD-CHATTER-001

- Added focused contract, validation, persistence, timeline, and restart coverage for the existing YAML-first lead-detail Send message / Log note workflow.
- Test: `crm_lead_chatter.integration.test.ts` — 2 pass / 14 assertions. Odoo authenticated desktop/mobile captures are recorded under the feature evidence folder.
- Core3 browser blocker is exact and reproducible: CRM-only runner returns 500 because `yaml.service.base` is not registered while resolving the existing contact lookup datasource. No Core3 visual parity claim; overall CRM remains conditional.

## Current coverage

## Capacity-recycle CRM takeover authorization (2026-09-13)

Same-module takeover is authorized only in inherited worktree
`/home/nhanjs/projects/core3-worktrees/odoo-crm-wave-20260912`, branch
`agent/odoo-crm-wave-20260912`, at `c5c3d6c3`, inheriting the dirty QA/handoff
docs and conversion findings. No product changes or visible process were found;
the takeover is not dispatched because no lifecycle handle is available here.
CRM remains pending for duplicate/permission/rollback/stale conversion tests.

- Odoo source inventory checked against `crm_menu_views.xml`, lead, team, and tag view sources.
- Existing Core3 routes cover leads, pipeline, activities, teams, reporting, settings, configuration, tags, stages, recurring plans, and lost reasons.
- Focused functional coverage includes lead conversion, activities, permissions/guards, team routing, reporting, activity plans, tags, stages, recurring plans, lost reasons, and leads analysis.
- The CRM service remains YAML-first; no CRM-specific hand-built HTML renderer was added. Existing UI primitives render through Core3 `html.js`.
- Migration consolidation to exactly `schema.yaml` and `demo.yaml` is not applied because the current migration loader only discovers timestamp/order filenames; changing loader behavior would cross the CRM-only file boundary. Existing development migration history is preserved.

## Reviewer reconciliation `31fd1443` (2026-09-13)

The AI YAML-context repair was already present on active; only the candidate
regression assertion was new, integrated as `56110795`. CRM verification passed
**45/212** and related CRM/Base QA passed **72/507**; audit **661/670/1,158**,
frontend build, and diff-check passed. QA reports authenticated desktop/mobile,
reload, conversion guards, rollback, and permission evidence. File-backed
restart durability and authenticated Odoo comparison remain open; no full CRM
sign-off.
