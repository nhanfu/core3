# CRM parity progress

| Field | Value |
| --- | --- |
| Module | `crm` |
| Owning agent | `agent/odoo-crm-wave-20260912` |
| State | `qa-in-progress` |
| Current goal | Complete CRM Odoo menu/action parity with durable YAML-first storage, service/API contracts, CRUD, workflows, permissions, browser evidence, and regression coverage. |
| Last commit | `85ebc4f9` (form-runtime repair) |
| Tester | QA slot pending dispatch |
| Last verification | 2026-09-12 — Core3 authenticated memory runtime on `http://127.0.0.1:4012` |
| Open bug IDs | `CRM-BOUNDARY-001`, `CRM-REF-001` |

## Bounded-slice history

| Date | Slice | Commit | Tests/audits | Browser captures | Blocker or next action |
| --- | --- | --- | --- | --- | --- |
| 2026-09-12 | Repair CRM tag catalog contract; add active filtering and row deletion; remove direct CRM SQL reads into isolated Base database for lead create/edit/convert transitions; update focused assertions | `3ad8bbd3b1d6649128a20af8fb41ac668ebe8c1c` | CRM focused suite: 51 pass, 2 fail (AI catalog boundary); `bun run audit`; `bun run lint`; `git diff --check` | `/tmp/core3-odoo-parity-crm-leads-desktop.png`, `/tmp/core3-odoo-parity-crm-leads-mobile.png`, `/tmp/core3-odoo-parity-crm-lead-created-desktop.png`; authenticated admin; Core3 route `/crm/leads` | `CRM-FUNC-001`: blank optional numeric/date form fields produce 500; populated create returned HTTP 200. `CRM-BOUNDARY-001`: contact-create still needs a declared Base create operation/orchestration. `CRM-AI-001`: shared AI allowlist lacks `crm.tags.delete` and cannot be changed in this CRM-only worktree. `CRM-REF-001`: no fresh authenticated Odoo comparison captured in this slice. |
| 2026-09-12 | Empty optional fields in lead creation | `85ebc4f9` | authenticated browser mutation HTTP 200; created detail shows Expected revenue `0`, Expected closing `—`; no browser errors | no new screenshot requested; browser state verified | `CRM-FUNC-001` fixed; Base contact cross-service boundary and Odoo comparison remain open |

## Current coverage

- Odoo source inventory checked against `crm_menu_views.xml`, lead, team, and tag view sources.
- Existing Core3 routes cover leads, pipeline, activities, teams, reporting, settings, configuration, tags, stages, recurring plans, and lost reasons.
- Focused functional coverage includes lead conversion, activities, permissions/guards, team routing, reporting, activity plans, tags, stages, recurring plans, lost reasons, and leads analysis.
- The CRM service remains YAML-first; no CRM-specific hand-built HTML renderer was added. Existing UI primitives render through Core3 `html.js`.
- Migration consolidation to exactly `schema.yaml` and `demo.yaml` is not applied because the current migration loader only discovers timestamp/order filenames; changing loader behavior would cross the CRM-only file boundary. Existing development migration history is preserved.
