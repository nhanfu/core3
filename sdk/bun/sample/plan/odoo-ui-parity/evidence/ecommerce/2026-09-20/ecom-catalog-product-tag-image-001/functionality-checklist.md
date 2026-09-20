# Functionality checklist

- [x] Durable image metadata table and idempotent migrations.
- [x] Separate YAML page and API contracts joined by `page.id`.
- [x] `ecommerce.read` detail/image/download boundary.
- [x] `ecommerce.write` upload/replacement boundary.
- [x] Image MIME and 5 MB validation before mutation.
- [x] Missing-tag and stale row-version guards leave no partial image row.
- [x] Replacing an existing image removes the prior current metadata row.
- [x] Downloaded bytes match the uploaded bytes.
- [x] DuckDB close/reopen preserves metadata and attachment bytes.
- [x] Authenticated Core3 desktop detail and upload evidence.
- [x] Authenticated Core3 mobile list/detail evidence.
- [x] Authenticated Odoo desktop/mobile blocker captures at both references.
- [ ] Paired Odoo visual comparison: blocked by authenticated `/shop` HTTP 404.
