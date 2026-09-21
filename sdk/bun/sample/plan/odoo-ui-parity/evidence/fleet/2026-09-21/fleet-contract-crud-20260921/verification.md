# Verification

The focused test exercised the real YAML mutation definitions against a
file-backed DuckDB database, closed and reopened the database, replayed
migrations, queried the detail/list datasources, edited with a current row
version, rejected a stale version, archived, restored, cancelled, rejected a
cancelled reopen, and deleted the created contract.

Browser verification was attempted with bsk on authenticated Chrome instance
`245ea108`, using a new owned session. Odoo desktop/mobile blocker captures are
referenced in `README.md`. The Odoo app launcher did not contain Fleet and
`http://localhost:8069/odoo/fleet` returned to Discuss; therefore no Odoo Fleet
visual or functional parity is claimed.

Core3 memory mode was started with `bun run dev --db=ddb --memory` after the
CRM discovery issue was resolved. The frontend reached `/vehicles`, but the
backend then returned 502 for `/api/modules` and the host hit its `EMFILE` file
descriptor limit. No Core3 desktop/mobile screenshot, browser CRUD, or visual
parity claim is made.

The bsk session was stopped after the capture attempt. No credentials, cookies,
tokens, or passwords are stored.
