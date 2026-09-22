# POS-SESSION-PAYMENTS-001 browser evidence

Date: 2026-09-22
Feature: POS Session Payments smart button
Browser instance: `245ea108`

## Source-backed reference contract

The local Odoo 19 source was inspected before implementation:

- `addons/point_of_sale/views/pos_session_view.xml` renders
  `action_show_payments_list` as the session-form `Payments` stat button and
  displays `total_payments_amount`.
- `addons/point_of_sale/models/pos_session.py` returns a `pos.payment`
  list/form action with the selected session domain, paid/invoiced/done order
  filter, and default grouping by payment method.

## Browser attempt and blocker

BrowserSkill status confirmed daemon `0.3.0`, protocol `1.3`, and connected
browser instance `245ea108`. User tabs listed:

| Tab | Scope | Title | URL |
| --- | --- | --- | --- |
| `1770662590` | user | Acme Corporation | `http://localhost:8069/odoo/contacts/9` |

The required authenticated Odoo tab was already borrowed by session `olvm`.
Attempting `bsk tab borrow 1770662590 --session xrhq --timeout 120s` returned
`tab is borrowed by another session`. A single follow-up attempt with a fresh
session and a 5-second timeout returned `timed out waiting for human
confirmation`. Per BrowserSkill instructions, the attempt was not repeated
and no other browser backend or independent login was used.

Therefore this run has no truthful live Odoo desktop/mobile capture, no Core3
authenticated desktop/mobile capture, and no visual-parity claim. The blocker
is tab ownership/borrow confirmation, not an inferred application result.

## Service evidence

The focused test and regression/build results are recorded in the POS QA
ledger. The page/API implementation remains limited to the POS service and
uses existing durable payment rows; there is no migration or external write.
