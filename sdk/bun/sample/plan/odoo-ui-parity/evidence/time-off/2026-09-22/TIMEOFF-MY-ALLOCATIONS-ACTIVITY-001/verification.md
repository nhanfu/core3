# Verification

## Core3 runtime blocker

Command: `bun run agent:module -- time-off --port=3047` from
`sdk/bun/sample`.

The process exited before binding the server while loading YAML APIs:

`packages/server/src/routes/yaml-api.ts:259`
`Conflicting declarations for named action: time_off.requests.refuse`

The duplicate named action is in existing Time Off request/approval/detail
contracts. Because Core3 could not serve `/my-allocations`, no authenticated
Core3 desktop/mobile captures or live network trace can be claimed for this
feature. The implementation did not alter that existing conflict.

## Odoo reference blocker

Browser instance `245ea108`, session `riwz`, desktop viewport `1916x833`, and
iPhone-14 emulation `390x844` were used. The authenticated route resolved to
Discuss and the app menu had no Time Off item. Captures:

- `odoo-reference-desktop-discuss-menu.png`
- `odoo-reference-mobile-discuss-menu.png`

SHA-256: desktop `29cc255835cb4838e54cf6f34b8dfebae7e5b6716041efe9a04974cd967b2452`;
mobile `841eb87ffef12d8fa1bf007fb9a3d27cca7d66576c5ac1a0e9063634203c9ee0`.

The bsk session was stopped after capture. No Odoo mutation occurred.

Therefore this feature has contract/data evidence but no claimed visual parity.
