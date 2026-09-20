# Verification

Authenticated Core3 evidence:

- Desktop: list before, Apply All modal, and after-apply state in `core3/`.
- Mobile: `core3/mobile-final.png` at 390px viewport via the authenticated
  direct route; final browser error list was empty and body width was 390px.
- Workflow: `[E-COM08] Storage Box`, 18 on hand / 20 counted / difference 2
  before; 20 on hand with counted and difference cleared after Apply All.

Authenticated Odoo comparison:

- Desktop and mobile captures in `odoo/` show the Physical Inventory list and
  responsive source surface at `/odoo/physical-inventory`.
- Odoo browser errors were empty and no Odoo mutation was performed.

Additional checks for this commit: `bun run audit`,
`bun run css:build:inventory`, ESLint for the focused integration test, and
`git diff --check`.
