# Product Tag Variant Assignment functionality checklist

- [x] Odoo `product_product_ids`, list field, and website variant tag source traced.
- [x] Page/API contracts remain separate and joined by `page.id`.
- [x] Durable relation and deterministic variant assignments are idempotent.
- [x] Variant projection and option source require `ecommerce.read`.
- [x] Assign/remove actions require `ecommerce.write`.
- [x] Active combination, company, duplicate, missing, and stale guards pass.
- [x] DuckDB restart preserves variant assignments and tag projections.
- [x] Authenticated Core3 desktop list/assignment form and mobile list captured.
- [x] Authenticated Odoo desktop/mobile comparison attempted on ports 8069 and 8073; exact `/shop` 404 blocker recorded.
- [ ] Odoo website combination rendering, tag image parity, and module sign-off.
