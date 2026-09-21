# Browser check

Browser skill session: own bsk session `auug`, browser instance `245ea108`.
The session was authenticated through the shared local QA flow without
recording credentials, cookies, or tokens.

## Odoo live reference

Service: `http://localhost:8069`, database `core3_reference`. Invoice:
`/odoo/invoicing/10` (`INV/2026/00008`).

- Desktop capture: `/tmp/core3-odoo-parity/accounting-invoice-print-20260921/odoo-invoice-detail-desktop.png`
  (1916x833), SHA-256
  `a49012664e20ad1ba8a6ecf916c19f28c40d2da911ed249dfd349b5625bec2f6`.
- Mobile capture:
  `/tmp/core3-odoo-parity/accounting-invoice-print-20260921/odoo-invoice-detail-mobile.png`
  (390x844), SHA-256
  `04754bc68bbb3d9dfd36c389852624be5596af6efcaa13ffd6de23512129ac79`.
- Mobile post-action capture:
  `/tmp/core3-odoo-parity/accounting-invoice-print-20260921/odoo-invoice-detail-mobile-after-print.png`
  (390x844), SHA-256
  `eb6a36f7b67b120c68911711cc7ef2b855c8b650d54f98fe7e0510ba6aa82a2e`.
- Desktop and mobile Print actions returned 200 for
  `POST /web/dataset/call_button/account.move/action_print_pdf` and
  `POST /report/download`; the latter was `application/pdf`.

## Core3 isolated runner

Service: `http://127.0.0.1:4011`, route
`/accounting/invoice-detail?id=accounting-invoice-demo-001`.

- Desktop capture:
  `/tmp/core3-odoo-parity/accounting-invoice-print-20260921/core3-invoice-detail-desktop.png`
  (1916x833), SHA-256
  `fe0d7a9fd743b394862b18a40433ec6ac8494fe55e607a5aee6bfcf0d472c570`.
- Desktop post-action capture:
  `/tmp/core3-odoo-parity/accounting-invoice-print-20260921/core3-invoice-detail-desktop-after-print.png`
  (1916x833), same SHA-256
  `fe0d7a9fd743b394862b18a40433ec6ac8494fe55e607a5aee6bfcf0d472c570`.
- Mobile post-action capture:
  `/tmp/core3-odoo-parity/accounting-invoice-print-20260921/core3-invoice-detail-mobile-after-print.png`
  (390x844), SHA-256
  `fd1a6de9013f1c3e78190df93d6d26da24369dc5ba1e74110568d8b62bf7114e`.
- Desktop and mobile returned 200 for `POST /api/mutate` and the two
  refreshed `POST /api/query` requests. The response is a durable report-run
  record; Core3 does not yet return PDF bytes.

The Core3 browser session was not used to claim reload persistence after its
in-memory auth expired on a direct reload; restart persistence is covered by
the focused integration test instead.
