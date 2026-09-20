# Browser verification

Core3 authenticated as `admin@tms.local` on the isolated runtime
`http://127.0.0.1:4543`:

- Desktop 1440x1000: list, pivot, and detail captures in `core3/` show six
  default Done rows, visible List/Pivot/Graph tabs, pivot state, and the
  read-only `WH/IN/00005` detail.
- Mobile 390x844: `core3/mobile-list.png` shows the responsive report state.
- Final browser checks reported `requestfailed: []`, `pageerror: []`, and
  body width equal to viewport width at both sizes.

Odoo authenticated as `codex@core3.local` at
`http://127.0.0.1:8069/odoo/moves-analysis`:

- Desktop 1440x1000: pivot and list captures in `odoo/`, with 55 list rows.
- Mobile 390x844: default/kanban captures in `odoo/`, with 61 kanban cards.
- Final Odoo checks reported no failed requests/page errors and body width
  equal to the viewport. No Odoo mutation was performed.

The shared full runner remains blocked by the unrelated Surveys schema
boundary noted in `test-results.md`; no other module files were changed.
