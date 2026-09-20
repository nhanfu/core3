# ECOM-CHECKOUT-DELIVERY-METHODS-001 functionality checklist

- [x] Odoo menu/action/model/list-form source traced.
- [x] Core3 manifest menu and `/ecommerce/delivery-methods` page/API join use
      `page.id: ecommerce-delivery-methods`.
- [x] Durable migration and deterministic fixtures are idempotent.
- [x] Active global/current-company carriers drive checkout delivery options.
- [x] `ecommerce.read` protects the page/catalog; `ecommerce.write` protects
      create, edit, archive, restore, and delete.
- [x] Name/type/price validation, duplicate company/name rejection, and
      company-scope enforcement are server-side.
- [x] Cash on Delivery compatibility is validated against carrier capability.
- [x] Optimistic row-version stale-write rejection is tested.
- [x] DuckDB restart persistence and checkout option ordering are tested.
- [x] Authenticated Core3 desktop/mobile list and desktop create evidence is
      captured with no page/request errors.
- [x] Authenticated Odoo desktop/mobile comparison attempted on ports 8069
      and 8073; exact `/shop` 404 blocker is recorded.
- [ ] Full Ecommerce module sign-off; paired Odoo reference and broader
      actor/company/external-delivery gates remain open.
