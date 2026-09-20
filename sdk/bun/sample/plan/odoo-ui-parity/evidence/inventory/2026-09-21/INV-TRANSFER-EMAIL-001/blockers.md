# INV-TRANSFER-EMAIL-001 blockers and open scope

- Odoo live paired desktop/mobile action screenshots were not captured in this
  bounded wave. Source/menu/action comparison is exact in
  `source-comparison.md`; no Odoo mutation was attempted.
- Core3 intentionally stops at a durable `Queued` outbox row. SMTP/provider
  dispatch, delivery status, bounce handling, and retries remain outside this
  slice.
- Odoo's multi-record mass-mail wizard is not duplicated; Core3 currently
  queues one selected transfer per form submission.

These are explicit follow-ups, not Inventory sign-off claims.
