# Product Variants functionality checklist

- [x] Odoo `product.product` and website_sale variant sources traced.
- [x] Page/API contracts are separate and joined by `page.id`.
- [x] Durable schema and deterministic variant/rule fixtures are idempotent.
- [x] Variant datasource read permission and CRUD write permission are declared.
- [x] CRUD, duplicate combination/reference, negative price, company, and stale-write cases pass.
- [x] DuckDB restart preserves variant and cart-line variant references.
- [x] Variant-specific pricelist resolution applies before template pricing.
- [x] Authenticated Core3 desktop detail/form and mobile detail captured.
- [x] Authenticated Odoo desktop/mobile comparison attempted on ports 8069 and 8073; exact `/shop` 404 blocker recorded.
- [ ] Full Odoo configurator/media/currency parity and module sign-off.
