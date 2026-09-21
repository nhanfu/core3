# PURCHASE-PRINT-001 — Purchase Order Print

Bounded feature: Odoo 19 Purchase Order form `Print` report actions.

Reference: authenticated local QA session at `http://localhost:8069`, database
`core3_reference`, confirmed order `P00012`. Core3: authenticated Admin User
at `http://localhost:4412/purchase/detail?id=po-demo-005` in an isolated runtime
built from the clean branch plus only the Purchase patch.

Screenshots are intentionally kept outside Git:

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Odoo confirmed order | `/tmp/core3-odoo-parity/purchase-order-print-20260921/odoo-confirmed-desktop-1440x900.png` (1916x833; SHA-256 `16170bf789f98d9d3015580a035b6688351fc8cf0e776c567ded37707b6839aa`) | `/tmp/core3-odoo-parity/purchase-order-print-20260921/odoo-confirmed-mobile-390x844.png` (390x844; SHA-256 `5f370f87a32885a2fae07d08d6f18368ad8858111e36e947f9a6031020fc2f8a`) |
| Core3 confirmed order | `/tmp/core3-odoo-parity/purchase-order-print-20260921/core3-confirmed-desktop.png` (1916x833; SHA-256 `43d73339cdb8af0ee4cafd6b269ab01f87071b9a48095a8538794323e1fa714e`) | `/tmp/core3-odoo-parity/purchase-order-print-20260921/core3-confirmed-mobile-390x844.png` (390x844; SHA-256 `0640ee5988027f41c0cc967162c6a266295e021bf761776862d189aaa7192e29`) |

Results:

- Odoo showed `Print` on the confirmed form at both viewports. Clicking it
  displayed the report loading overlay and returned to the same form; the
  browser did not expose download completion as DOM state.
- Core3 showed `Print` at both viewports. Clicking it returned HTTP 200 for
  `POST /api/mutate` and the subsequent detail/print-history refresh queries.
- Core3 body/document widths were 1916/1916 on desktop and 390/390 on mobile;
  no horizontal overflow was observed.
- No password, cookie, token, or downloaded report bytes were extracted.

Known limits: the Core3 bounded operation records the source PDF report
contract and durable print history but does not yet render a binary PDF. The
shared active worktree could not start because unrelated Email/SMS YAML changes
failed global discovery; those changes were left untouched.
