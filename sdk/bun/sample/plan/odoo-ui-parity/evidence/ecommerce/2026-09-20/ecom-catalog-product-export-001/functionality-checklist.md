# Functionality checklist

- [x] Separate Products page/API contracts joined by `page.id`.
- [x] `ecommerce.read` permission on page, datasource, and export action.
- [x] Stable CSV columns, filename, content type, and JSON escaping.
- [x] Current-company filtering and no cross-company widening.
- [x] Read-only/idempotent export with no database mutation.
- [x] Row-version visibility after a concurrent product edit.
- [x] Migration replay and DuckDB restart persistence.
- [ ] Authenticated Core3 desktop/mobile browser capture: blocked by shared
      Inventory discovery error.
- [ ] Paired Odoo visual comparison: blocked by exact `/shop` HTTP 404.
