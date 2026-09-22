# Functionality checklist

- [x] Project detail exposes manager-only Share Project action.
- [x] Page/API ownership remains joined by project-detail.
- [x] Access mode and invitation fields are validated by the modal/API contract.
- [x] Collaborator email is normalized and persisted durably.
- [x] Deterministic portal-detail share link is returned.
- [x] Missing, restricted, archived/template, duplicate, invalid, and stale guards.
- [x] Fixed-date migration seed and project row-version increment.
- [ ] Authenticated Odoo/Core3 desktop capture at 1440x900.
- [ ] Authenticated Odoo/Core3 mobile capture at 390x844.
- [ ] Browser actor/permission and request-error probes.
- [ ] Email delivery, portal-user provisioning, and revoke workflow.

Unchecked browser and delivery items are outside the available verification
boundary or the bounded slice; they are not represented as passes.
