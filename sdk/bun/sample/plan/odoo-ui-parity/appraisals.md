# Appraisals — sub-plan

Status: `planning`

## Reference

- Odoo addon: `hr_appraisal` (Odoo 19 Community)
- Source availability: unavailable in the supplied Odoo source; use documented Odoo 19 UI contract
- Odoo demo data: addon/demo manifest must be verified when source is supplied; provide deterministic sample and empty modes
- Core3 service: `appraisals`

## UI inventory

- Appraisal dashboard, My Appraisals, To Review, and configuration menus.
- Appraisal kanban/list with stages, employee, manager, deadline, search, filters, group-by, favorites, and pager.
- Appraisal form with goals, competencies, feedback/questions, employee/manager, date, next appraisal, skills, action buttons, and chatter/activity.
- Employee appraisal history, printable/report summary, schedule/create dialog, completed/cancelled/empty states, and mobile card/form views.

## Core3 backend mock-data plan

Use `appraisals`, `appraisal_stages`, `appraisal_goals`, `appraisal_competencies`, `appraisal_questions`, `appraisal_employees`, `appraisal_activities`, `appraisal_chatter`, and `appraisal_reports`. `default` covers every stage, goals/questions, reviewer relations, and a complete form. States: `to_review`, `completed`, `cancelled`, `employee_grouped`, `empty`, `form_edit`, `report`, `mobile`.

## Shared UI primitives

Kanban/list/form tabs, stage/status bar, goal and competency child grids, rating controls, date fields, activity/chatter, report renderer, dialogs, and responsive cards.

## Screenshots

Capture Odoo contract/reference and Core3 at 1440x900 and 390x844 for dashboard, kanban/list, appraisal form, report, and empty/completed states.

## Acceptance criteria

- Menus, stages, fields, action buttons, rating/goal sections, report, and mobile presentation match the Odoo 19 contract.
- Backend YAML provides all visible appraisal records, child rows, ratings, activities, chatter, report values, and named empty states.
- Schedule, edit/save/discard, stage transitions, search/filter/group, and responsive rendering work offline.
- Missing-source assumptions are explicitly documented and the datasource contract remains query-replaceable.
