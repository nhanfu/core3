# Functionality checklist

- [x] Manifest menu is `Products > Combo Choices` with `ecommerce.read`.
- [x] Page/API contracts join on `ecommerce-combo-choices`.
- [x] Deterministic combos and product options survive migration reruns.
- [x] Search, computed minimum price, product count, empty, and transport error
  states are declared.
- [x] `ecommerce.read`/`ecommerce.write` boundaries are declared and tested.
- [x] Create, edit, and delete replace/clean option rows durably.
- [x] Validation covers empty, malformed, negative, duplicate, inactive, and
  combo-product options plus company scope.
- [x] Optimistic row-version stale mutation and DuckDB restart cases pass.
- [x] Authenticated Core3 desktop and mobile evidence is captured.
- [x] Authenticated Odoo desktop and mobile exact `/shop` blocker evidence is
  captured on ports 8069 and 8073.
