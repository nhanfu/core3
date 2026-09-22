# Functionality checklist

- [x] Source XML and Python method inspected at pinned revision.
- [x] Existing non-zero model navigation remains filtered by model.
- [x] Zero-count model shows the New Vehicle action.
- [x] default_model_id and model row version are passed from YAML state.
- [x] Vehicle, model relation, derived fields, and model count persist atomically.
- [x] Active model and zero-count guards are enforced server-side.
- [x] Duplicate name/license, blank fields, negative odometer, and invalid dates are rejected.
- [x] Company scope and stale model-version guards are enforced.
- [x] Migration is idempotent and preserves a created vehicle through restart.
- [x] Focused and model regression tests pass.
- [ ] Authenticated Odoo/Core3 desktop/mobile visual evidence: blocked by existing tab ownership.
