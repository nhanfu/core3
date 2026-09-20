# INV-TRANSFER-EMAIL-001 source comparison

Date: 2026-09-21

## Odoo source/menu/action

- `addons/stock/views/stock_picking_views.xml:513-523` declares the stock
  picking list/kanban action `action_lead_mass_mail`, labelled `Send email`,
  targeting `mail.compose.message` with `default_composition_mode: mass_mail`.
- `addons/mail/wizard/mail_compose_message_views.xml:4-18,55,67-90` supplies
  the modal composer with recipient, subject, body, and Send controls.
- `addons/mail/wizard/mail_compose_message.py:804-807` dispatches the
  `mass_mail` composition mode.

## Core3 mapping

- `services/inventory/pages/receipts.yaml` and `pages/deliveries.yaml` expose
  the list action while keeping page layout separate from API behavior.
- `services/inventory/api/transfers.yaml` and `api/deliveries.yaml` own the
  `server_form` contracts, validation, permission, company, actor, state, and
  row-version guards.
- Migration `20260921110000-037-inventory-transfer-emails.yaml` persists
  `inventory_transfer_email_runs` and seeds `delivery-email-0001`.
- `api/transfer-detail.yaml` and `pages/transfer-detail.yaml` expose queued
  email history and the `inventory.transfer.email_queued` timeline event.

The bounded Core3 behavior is the single-selected-transfer equivalent of the
source mass-mail action. It persists `Queued` state for later delivery; it does
not claim external SMTP delivery or Odoo's multi-record wizard semantics.

## Comparison disposition

Core3 contract/source mapping: PASS. Authenticated Core3 browser evidence is
captured at desktop and mobile widths. The supplied live Odoo route/action was
not captured in this wave, so no Odoo visual parity or mutation sign-off is
claimed.
