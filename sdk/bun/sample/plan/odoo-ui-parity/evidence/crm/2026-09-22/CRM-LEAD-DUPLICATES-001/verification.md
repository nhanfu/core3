# Verification and blockers

## Odoo reference

Authenticated bsk session on browser instance `245ea108`, database
`core3_reference`, URL `http://localhost:8069`:

- Desktop: Discuss fallback, 1440px viewport; PNG
  `/tmp/core3-odoo-parity/crm-lead-duplicates-20260922/odoo-reference-desktop.png`
  SHA-256 `b8655837d827f6ce56f79d451717c66d2d57ba9448672601f6f6511a5b48d3c3`.
- Mobile: Discuss fallback, 390x844 viewport; PNG
  `/tmp/core3-odoo-parity/crm-lead-duplicates-20260922/odoo-reference-mobile.png`
  SHA-256 `873195fffa4f3af0256e8c8f40627c27924a73d62f5a249b926121132cbb8a9c`.
- Blocker: CRM is not installed/exposed in `core3_reference`; the launcher
  contains Discuss and `/odoo/crm` resolves to Discuss. The reference database
  was not mutated.

## Core3 browser

Blocked before authenticated rendering. `bun run dev --db=ddb --memory`
stopped during discovery on unrelated Events definitions:

- `upload_event_badge_background` is referenced but not declared.
- `FormSection` has no registered page-component schema.

No Core3 screenshot or visual parity claim is recorded. The requested bsk
session was stopped cleanly after the reference captures.
