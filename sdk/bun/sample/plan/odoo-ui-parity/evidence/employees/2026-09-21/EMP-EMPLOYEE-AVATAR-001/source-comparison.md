# EMP-EMPLOYEE-AVATAR-001 source comparison

Odoo source:

- `addons/hr/views/hr_employee_views.xml` renders
  `image_1920` with the `image` widget, zoom enabled, a 128x158 preview, and
  `avatar_128` as the preview field.
- `addons/hr/models/hr_employee.py` defines the related image/avatar compute
  path and synchronizes the employee image with the related work contact when
  applicable.

Core3 implements the bounded employee-facing lifecycle with separate YAML
contracts:

- `pages/employee-detail.yaml` binds `avatar_field: image_url` and upload/remove
  header actions.
- `api/employee-detail.yaml` declares `employee_avatar`, guarded image upload,
  and guarded remove mutations.
- `storage.yaml` exposes the authenticated employee avatar download route.
- Migration `20260922160000-070-employee-avatar.yaml` creates durable metadata,
  seeds one deterministic inline SVG fixture, and projects its authenticated
  image URL.

The source-visible zoom/preview is represented by the Core3 avatar field, while
the upload path stores real file metadata and uses the service file store.
Odoo authenticated comparison remains blocked by unavailable credentials; the
Core3 fixture-company mismatch is retained explicitly in `verification.md`.
