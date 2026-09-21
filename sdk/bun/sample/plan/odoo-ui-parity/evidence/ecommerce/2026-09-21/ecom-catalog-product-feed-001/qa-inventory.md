# QA inventory

| Area | Result | Evidence |
| --- | --- | --- |
| Odoo model/controller/menu/security trace | Pass | `source-comparison.md` |
| Paired page/API/public operation YAML | Pass | focused schema and identifier assertions |
| Durable migration/data | Pass | migrations 100/101 and replay test |
| Feed CRUD/generation/cache | Pass | focused create, XML, edit invalidation, delete, restart cases |
| Permission/company boundary | Pass | Ecommerce read/write declarations and 403 mutation case |
| Validation/concurrency/token | Pass | selector validation, stale 409, wrong-token empty result |
| Core3 desktop/mobile UI | Blocked | `browser-check.md` |
| Authenticated Odoo comparison | Blocked | exact `/shop` 404 in `browser-check.md` |
| Module sign-off | Open | this is one bounded feature slice |
