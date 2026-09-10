# Partner accounting configuration

`/accounting/partner-accounting` is the bounded Accounting-owned counterpart to
the Sales & Purchase and Invoicing configuration visible on an Odoo contact
form. It exposes deterministic customer/vendor defaults for payment terms and
fiscal position, alongside partner type and company.

The page is layout-only. Its datasource is convention-discovered from
`api/partner-accounting.yaml` through the matching `page.id`, and its records
are seeded by migration `20260910200000-011-accounting-partner-config.yaml`.
This slice intentionally does not alter the shared contacts service or add
partner editing; customer and vendor CRUD remains outside this bounded
configuration catalog.
