# Source comparison

Odoo source:

- `addons/hr/models/hr_employee.py`: `user_id` is a stored, editable related
  `Many2one('res.users')` through `resource_id.user_id`, with the source model's
  user uniqueness/company constraint.
- `addons/hr/views/hr_employee_views.xml`: the employee form renders the
  `user_id` control in Settings with ERP-manager access, and the employee list
  exposes the related user column.

Core3 mapping:

- API `employee_detail` already projects `auth_user_id` and `user_name`.
- `employee_related_user_options` is a permissioned select datasource, and
  `edit_employee_related_user` is an `auth.users.manage` server-form mutation.
- The page binds the action in the employee detail header and retains the
  Settings `Related User` display field; page YAML and API YAML remain separate
  and join on `page.id: employee-detail`.
- Migration `20260922090000-063` adds a unique employee relationship index and
  an Employees-local deterministic projection of the seeded auth IDs. This is
  necessary because the sample's auth and Employees services use separate
  databases; a live cross-service user search is not available in this slice.

Boundary:

- Actor, active employee, current employee company, enabled catalog user,
  duplicate relationship, and optimistic row-version guards are enforced.
- Auth catalog company labels are not currently normalized to the employee
  fixture label (`Core3 Demo Company` / `Core3 Vietnam Branch` versus
  `Core3 Vietnam`). The target employee company guard is therefore explicit,
  while cross-service user-company resolution remains a documented blocker.
