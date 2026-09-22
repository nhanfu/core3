# Verification

The focused test exercised the real YAML repository mutation and file route.
It verified:

- the invoice page/API join is `invoice-detail`;
- a deterministic `supplier-quote.txt` row is queryable;
- read-only upload returns 403;
- a valid upload returns 200, persists metadata, adds an invoice message, and
  advances the parent invoice row version from 1 to 2;
- duplicate and stale uploads return 409;
- the protected seeded attachment download returns the exact text bytes;
- the uploaded metadata survives closing and reopening DuckDB; and
- the migration is rerunnable without duplicating the deterministic fixture.

This is a functional/data/permission verification only. It is not a visual
parity sign-off because the authenticated Odoo tab could not be borrowed.
