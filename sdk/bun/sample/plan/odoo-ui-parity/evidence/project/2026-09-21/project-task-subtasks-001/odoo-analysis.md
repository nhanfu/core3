# Odoo source and live reference

- Model: `/home/nhanjs/projects/odoo/addons/project/models/project_task.py`
  declares `parent_id`, `child_ids`, `subtask_count`, and
  `closed_subtask_count`.
- View: `/home/nhanjs/projects/odoo/addons/project/views/project_task_views.xml`
  renders the task notebook `Sub-tasks` tab with `child_ids`, inline Add a
  line, Title/Assignees and open-form/delete affordances.
- Live reference: authenticated Odoo at `http://localhost:8069`, database
  `core3_reference`; the task detail showed the Sub-tasks tab and an inline
  new-row title field after Add a line. The temporary row was discarded.
