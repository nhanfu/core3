# POS Orders Send Email evidence

Date: 2026-09-21

## Source and reference UI

- Odoo 19 source: `/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_order_view.xml`, `model_pos_order_send_mail`.
- Authenticated Odoo reference: `http://localhost:8069/odoo`, database `core3_reference`.
- Browser instance: `245ea108`; the agent-owned bsk session was stopped after the capture attempt.
- The authenticated Odoo desktop capture shows the logged-in Odoo shell. A subsequent semantic observation of the application switcher showed the Point of Sale menu and its existing Orders family. Capture: `/tmp/core3-odoo-parity/pos-order-send-email-20260921/odoo-authenticated-desktop.png`.

## Core3 status

The focused in-memory integration test, YAML audit, POS CSS build, and ESLint passed. An authenticated Core3 Orders list had been reached earlier in this wave, but the final Send Email composer and queued-submit browser proof could not be captured in this run because the local backend did not open port 3001. The bounded runtime retry left Vite on port 3002 while the backend remained unavailable; the prior standalone attempt failed while replaying `sdk/bun/sample/coredb/accounting.duckdb.wal` with DuckDB `Calling DatabaseManager::GetDefaultDatabase with no default database set`.

No desktop Core3 action-completion or mobile parity claim is made. The screenshot remains outside Git under `/tmp`.
