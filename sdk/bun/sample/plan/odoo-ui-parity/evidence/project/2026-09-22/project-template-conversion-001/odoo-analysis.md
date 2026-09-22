# Odoo source comparison

Reference: local Odoo 19 checkout `/home/nhanjs/projects/odoo`.

Sources read:

- `addons/project/views/project_project_views.xml`
  - `action_server_convert_project_to_template`
  - server action name `Convert to Template`
  - `binding_model_id` is `project.project`
  - `binding_view_types` is `form`
  - manager group restriction
- `addons/project/models/project_project.py`
  - `action_toggle_project_template_mode`
  - `action_create_template_from_project`
  - template copy sets `is_template`, creates reusable task templates, and
    archives the original project

Core3 maps this record action to `convert_project_to_template` in the existing
`project-detail` page/API pair. The bounded implementation preserves the
manager boundary and durable conversion outcome. Template undo conversion,
portal-user creation/email delivery, and complete nested task mapping are not
part of this stable-ID slice.
