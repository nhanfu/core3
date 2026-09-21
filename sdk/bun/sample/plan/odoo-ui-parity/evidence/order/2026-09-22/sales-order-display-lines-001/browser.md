# Sales order display lines — browser evidence and blockers

Browser instance: `245ea108`; service: `http://localhost:8069`; database:
`core3_reference`.

Authenticated Odoo captures:

- Desktop New quotation with controls:
  `/tmp/core3-odoo-parity/sales-next-20260922/odoo-display-lines-desktop.png`
- Desktop after `Add a section`, showing the zero-total description row and
  overflow action:
  `/tmp/core3-odoo-parity/sales-next-20260922/odoo-display-section-desktop.png`
- Mobile after `Add a section`, showing the responsive row editor:
  `/tmp/core3-odoo-parity/sales-next-20260922/odoo-display-section-mobile.png`

Core3 blocker: the run checked listeners before browser navigation and found
only `0.0.0.0:8069`; neither `127.0.0.1:3001` nor `127.0.0.1:3002` was
available. Core3 authenticated desktop/mobile interaction, persistence reload,
and paired visual comparison therefore remain unexecuted. These artifacts do
not claim Core3 visual parity.
