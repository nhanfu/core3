# Odoo analysis

Local source: `/home/nhanjs/projects/odoo`, Project addon, branch `19.0`,
revision `65975996`.

- Menu: `addons/project/views/project_menus.xml`,
  `menu_project_management` > `menu_project_management_all_tasks`.
- Action: `addons/project/views/project_task_views.xml`,
  `action_view_all_task`; model `project.task`; path `all-tasks`.
- Domain: `has_template_ancestor = False` and `has_project_template = False`.
- Context: default open tasks and current user in the default assignee set.
- View order: `list,kanban,form,calendar,activity,pivot,graph`.
- Search contract: task, project, assignee, stage, priority, deadline,
  open/closed, and grouping by stage, milestone, priority, tags, customer,
  company, creation date, assignees, and project.
- Empty copy: `No tasks found. Let's create one!` followed by the dispatch and
  collaboration help text in the source action.

The authenticated live inspection was attempted through BrowserSkill as
required, but the existing tab borrow timed out at the extension confirmation
boundary before the All Tasks action could be opened. The source trace is
therefore the accepted comparison contract for this batch.
