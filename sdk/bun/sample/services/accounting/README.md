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

## Secure journal entries

`/accounting/secure-entries` is the bounded Core3 counterpart to Odoo 19's
Accounting → Closing → Secure Entries wizard (`account.action_view_account_secure_entries_wizard`).
The layout is page-owned while `api/secure-entries.yaml` owns the datasource and
write action through the matching `page.id`. Migration
`20260911100000-015-accounting-secure-entries.yaml` seeds one deterministic
company state with nine eligible journal entries.

The read boundary requires `accounting.read`; the Secure Entries transition
requires `accounting.write`, rejects dates before 2000, after the deterministic
`2026-01-15` fixture boundary, or before the previously secured date, and
increments the row version after securing the fixture entries. The separate
Discard action returns to Closing. This slice does not implement Odoo's
underlying cryptographic hash chain or journal-entry locking; those are
deliberately outside the wizard UI boundary.
