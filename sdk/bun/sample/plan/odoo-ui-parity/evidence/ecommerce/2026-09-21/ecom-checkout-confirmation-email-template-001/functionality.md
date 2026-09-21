# Functionality evidence

- Migration replay twice creates the active template catalog and unique
  company policy without duplicating deterministic fixtures.
- The My Company policy starts with `Sales Order Confirmation`; options are
  restricted to active `sale.order` templates.
- Wrong-company scope, missing/incompatible template, and stale row-version
  updates are rejected with explicit 409/422 errors.
- A valid update selects `Website Sale Confirmation` and increments the policy
  version.
- Authenticated and guest checkout orders snapshot the selected template ID and
  name; the snapshot remains attached to each order after later policy changes.
- A file-backed DuckDB restart preserves the selected policy and version.
