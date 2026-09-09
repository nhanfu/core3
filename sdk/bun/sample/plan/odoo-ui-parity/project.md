# Project — sub-plan

Status: `planning`

## Reference

- Odoo addon: `project` (Odoo 19 Community)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: manifest/demo records available; preserve project/task demo and empty modes
- Core3 service: `project`

## UI inventory

- Projects dashboard, My Projects, Projects, Tasks, Reporting, and configuration menus.
- Project list/kanban with stages, manager, tags, task counters, privacy, search/filter/group, favorites, pager, archive, and create.
- Project form with description, members, stages, task settings, milestones, analytic/billing settings, visibility, activities, and chatter.
- Task kanban/list/form/calendar with stage drag/drop, assignee, tags, deadline, priority, subtasks, dependencies, timesheets, activities, chatter, and task status.
- Project/task analysis graph/pivot, milestones, mobile kanban/list/form, dialogs, and empty states.

## Core3 backend mock-data plan

Use `projects`, `project_members`, `project_stages`, `project_tasks`, `project_subtasks`, `project_dependencies`, `project_milestones`, `project_tags`, `project_activities`, `project_chatter`, and `project_analysis`. `default` covers multiple projects, all task stages, hierarchy/dependencies, milestones, members, and complete forms. States: `active`, `archived`, `stage_grouped`, `empty`, `task_form`, `calendar`, `analysis_graph`, `analysis_pivot`, `mobile`.

## Shared UI primitives

Project/task kanban/list/form/calendar, hierarchy and dependency indicators, milestone progress, priority/status, members/relations, timesheet summary, activities/chatter, graph/pivot, search panel, pager, and mobile navigation.

## Screenshots

Capture Odoo/Core3 at 1440x900 and 390x844 for projects dashboard/list, project form, task kanban/list/form/calendar, milestones, reporting, and empty states.

## Acceptance criteria

- Project/task menus, stages, hierarchy, dependencies, milestones, actions, reporting, and responsive layouts match Odoo.
- All visible project/task/member/stage/milestone/dependency/activity/chatter/report data is declared in backend YAML states.
- Create/edit/save/discard, drag stage, archive, filters/grouping, calendar, and pager render without a database and pass fixture audit.
