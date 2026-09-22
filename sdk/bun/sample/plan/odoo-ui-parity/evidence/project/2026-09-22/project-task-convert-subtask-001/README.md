# Project task Convert to Task/Sub-Task

Stable feature ID: `PROJECT-TASK-CONVERT-SUBTASK-001`.

The implementation binds Odoo's form-only `action_server_convert_to_subtask`
to the Project task detail page. It uses the existing durable `parent_task_id`
relation, a page-ID-matched API fragment, an active same-project parent lookup,
and a row-version guarded mutation that supports both sub-task and standalone
task states. Descendant-cycle, invalid-parent, archived/missing, and stale
guards are declared in the service contract.

Source comparison was made against Odoo 19 at `/home/nhanjs/projects/odoo`:
`addons/project/views/project_task_views.xml` and
`addons/project/models/project_task.py`. Focused evidence is
`test/project_task_convert_subtask.integration.test.ts`.

BrowserSkill status was connected, but the explicit confirmation request for
the authenticated Odoo tab timed out after 15 seconds. The tab was not used,
no credentials or tokens were accessed, and no Odoo/Core3 screenshot or visual
parity claim is made for this feature.
