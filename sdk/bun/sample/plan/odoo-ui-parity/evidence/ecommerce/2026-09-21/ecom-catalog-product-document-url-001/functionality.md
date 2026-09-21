# Functionality

- Deterministic Mug fixture includes a published URL document with
  `document_type=url` and an HTTPS URL.
- `ecommerce.write` URL assignment requires a row version, product/company
  scope, and an absolute HTTP or HTTPS URL without spaces.
- A file upload changes the document back to `document_type=file` and clears
  its external URL.
- Product Detail lists URL and file documents separately through the existing
  document API/page pair.
- The public route redirects only active, published URL documents for the
  requested product; missing or unrelated documents return a not-found result.
- Migration replay is idempotent and URL state survives DuckDB close/reopen.
