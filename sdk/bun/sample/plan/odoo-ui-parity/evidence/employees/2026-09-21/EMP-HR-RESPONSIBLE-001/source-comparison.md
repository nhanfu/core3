# Source comparison

- Odoo model: `/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py`
  defines `hr_responsible_id` as the HR approver user relation.
- Odoo employee form:
  `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml` renders
  `hr_responsible_id` with `many2one_avatar_user` under the Settings
  Approvers group.
- Core3 page/API join: both contracts use page id `employee-detail`.
  `pages/employee-detail.yaml` renders a write-gated Approvers group and
  `api/employee-detail.yaml` provides the guarded action and detail projection.
- Core3 storage: migration `20260921210000-051-employee-hr-responsible.yaml`
  adds employee and current-version projections, seeds deterministic approver
  names, and synchronizes the current active version on edit.
