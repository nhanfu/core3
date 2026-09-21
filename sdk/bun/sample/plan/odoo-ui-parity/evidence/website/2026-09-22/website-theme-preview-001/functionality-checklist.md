# Functionality checklist

- [x] Theme Preview has a page-only YAML contract and matching API-only YAML
  contract joined by `page.id`.
- [x] Theme Manager exposes a permissioned Preview row action.
- [x] Preview form is read-only and exposes theme/site/status metadata.
- [x] Open preview is site-scoped and carries the selected theme preview scope.
- [x] Theme visual tokens are durable, deterministic, and migration-safe.
- [x] Installed and preview theme effects are returned by the public Website
  operation and applied only after six-digit-hex validation.
- [x] Theme selection and visual effects survive file-backed restart and
  migration replay.
- [x] `website.read` is required for preview discovery and actions; no preview
  action mutates state.
- [ ] Authenticated Odoo/Core3 desktop and mobile visual comparison.
