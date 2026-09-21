# EXPENSE-FUNC-012 - expense category cost propagation

This bounded slice implements the Odoo `hr_expense` product-category cost write
behavior. The Core3 page remains presentation-only; the API/action, migration,
persistence, and tests are module-owned.

Evidence files: `source-comparison.md`, `odoo-analysis.md`, `gap-matrix.md`,
`functionality-checklist.md`, `test-results.md`, `verification.md`,
`odoo-expenses-desktop-1916x833.png`, and `odoo-expenses-mobile-390x844.png`.

The PNGs are authenticated Odoo captures from `core3_reference` at
`http://localhost:8069`. No password, cookie, token, or credential is stored.
