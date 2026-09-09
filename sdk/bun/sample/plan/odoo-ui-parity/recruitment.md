# Recruitment — sub-plan

Status: `planning`

## Reference

- Odoo addon: `hr_recruitment` (Odoo 19 Community)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: manifest/demo records available; retain populated and no-demo modes
- Core3 service: `recruitment`

## UI inventory

- Recruitment app, Jobs menu, Applications menu, reporting menu, and configuration entries.
- Job positions kanban/list with stages, search, filters, group-by, favorites, publish/unpublish, create, archive, and pager.
- Job-position form with description, requirements, departments, recruiter, interviews, application target, website publication, and chatter.
- Applications kanban/list/form with stage drag/drop, candidate/contact, source, email/phone, resume attachments, activities, interview plan, refuse/restore, and send-message actions.
- Recruitment analysis graph/pivot, mobile kanban/list, filter drawer, dialogs, and overflow actions.

## Core3 backend mock-data plan

Use backend datasources `recruitment_jobs`, `recruitment_stages`, `recruitment_applications`, `recruitment_candidates`, `recruitment_sources`, `recruitment_interviews`, `recruitment_activities`, `recruitment_chatter`, and `recruitment_analysis`. `default` covers each kanban stage, paging, attachments, and a complete job/application form. States: `search`, `stage_grouped`, `refused`, `empty`, `analysis_graph`, `analysis_pivot`, `form_edit`, `mobile`.

## Shared UI primitives

Kanban drag/drop, list/card/form navigation, stage/status pills, contact and attachment fields, activity/chatter, graph/pivot renderers, publish toggle, confirmation dialogs, search panel, and responsive navigation.

## Screenshots

Capture Odoo/Core3 at 1440x900 and 390x844 for jobs kanban, applications kanban/list, job form, application form, and graph/pivot analysis, including empty/refused states.

## Acceptance criteria

- Job and application menus, stages, actions, forms, analysis views, and mobile layouts match Odoo.
- All visible kanban columns, cards, form fields, attachments, activities, graph points, pivot cells, and empty states come from backend YAML `mock_data` states.
- Stage changes, publish/refuse/restore, search/filter/group, pager, edit/save/discard, and responsive controls render without a live database.
- Fixture audit confirms every page datasource is declared and replaceable by a later query.
