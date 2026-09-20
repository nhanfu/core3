# Functionality evidence

The deterministic migration fixture begins with Mug 10, Chair 20, Setup 30,
and Lamp 40. The focused test exercises:

1. Mug down swaps with Chair and increments both row versions.
2. Mug up swaps back with Chair.
3. Mug bottom assigns the deterministic trailing position.
4. Mug top assigns the deterministic leading position.
5. A stale row version returns HTTP 409 with
   `ECOMMERCE_PRODUCT_SEQUENCE_STALE`.
6. A different company returns HTTP 403 with
   `ECOMMERCE_PRODUCT_SEQUENCE_COMPANY_SCOPE_REQUIRED`.
7. Moving the edge Lamp down returns HTTP 409 with
   `ECOMMERCE_PRODUCT_SEQUENCE_EDGE`.
8. Reopening the DuckDB repository preserves the reordered value and row
   version.

The API and page contracts are validated together by matching their page and
action identifiers. The server mutations refresh the Products list, detail,
and public shop data sources.
