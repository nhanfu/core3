# Verification

The bounded implementation is functionally complete for the selected action.
Page YAML contains presentation only; datasource and mutation ownership lives
in `api/opening-detail.yaml`, joined by `page.id`. The opening company column,
index, fixed dates, deterministic insert ID, and applicant row are durable in
the service migration/table path. The existing `/openings` datasource now
returns the durable company field and applies authenticated company scope.

No module-wide completion or visual-parity sign-off is claimed. Live Odoo
desktop/mobile comparison is blocked before tab borrow; see
`browser-check.md`.
