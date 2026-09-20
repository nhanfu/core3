# Functional evidence

The focused integration suite exercised:

- deterministic fixture replay and product-document list projection;
- Product Detail → Product Document navigation and separate page/API IDs;
- document metadata creation followed by multipart binary upload;
- `ecommerce.read`/`ecommerce.write` declarations and download contract;
- current-company enforcement, wrong-company rejection, non-empty/5 MB
  validation, optimistic stale-write rejection, edit, publish toggle, and
  delete;
- local attachment download with exact bytes after DuckDB close/reopen and
  migration replay.

The service test passed 33 assertions across three tests. No full Ecommerce
sign-off is claimed.
