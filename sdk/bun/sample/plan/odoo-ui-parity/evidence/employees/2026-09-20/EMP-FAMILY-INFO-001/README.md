# EMP-FAMILY-INFO-001 evidence

Authenticated Core3 and Odoo Personal-tab Family captures for marital status,
conditional spouse fields, and dependent children.

- Core3: `admin@tms.local` at `127.0.0.1:3310`; the authenticated browser
  created a Demo-company employee with `married`, `Mai Browser`,
  `1991-05-06`, and two children, then rendered the detail at `1440x900` and
  `390x844`. Both widths match the viewport and page/request errors are empty.
- Odoo: authenticated `codex@core3.local` on `core3_reference`, Abigail
  Peterson detail, Personal tab at `1440x1000` and `390x844`. The Family
  group and all four labels render. The desktop probe recorded one unrelated
  aborted `/mail/data` request and seven app-icon 404s; no page errors or
  overflow occurred.

See `core3-browser.json`, `odoo-browser.json`, and the four PNG captures.
