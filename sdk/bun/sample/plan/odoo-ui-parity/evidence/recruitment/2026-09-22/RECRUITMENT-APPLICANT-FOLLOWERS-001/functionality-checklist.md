# Functionality checklist

- [x] Applicant list bulk action is labeled `Add/Remove Followers` and uses
  the source page/API `page.id` contract.
- [x] Modal exposes Applications, Add/Remove, Followers, Notify Recipients,
  Extra Comments, Update Followers, and Discard.
- [x] Active follower contacts are selectable; inactive contacts are rejected.
- [x] Add and Remove apply to multiple selected applicants atomically and are
  idempotent on replay.
- [x] Notify is only valid for Add and persists notification intent/message in
  an audit table; no SMTP boundary is claimed.
- [x] Missing selection, actor, applicant, company scope, operation, contact,
  notification, and message-length guards are declared and tested.
- [x] Applicant detail renders durable follower count and names after reload.
- [x] Seed data and follower subscriptions are deterministic and migration is
  idempotent; file-backed restart retains subscriptions.
- [ ] Authenticated Odoo desktop/mobile visual comparison: blocked because the
  shared reference session exposes no Recruitment action.
- [ ] Authenticated Core3 desktop/mobile capture: pending runtime availability.
