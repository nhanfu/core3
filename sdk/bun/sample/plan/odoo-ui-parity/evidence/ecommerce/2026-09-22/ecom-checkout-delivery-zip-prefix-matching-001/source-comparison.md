# Source comparison

Odoo 19 source inspected:

- `addons/delivery/models/delivery_carrier.py`: `zip_prefix_ids` is a
  Many2many carrier field; `_match_address()` rejects a carrier with assigned
  prefixes when the shipping zip is absent or does not match `^<prefix>`.
- `addons/delivery/models/delivery_zip_prefix.py`: Prefix values are
  uppercased on create/write.
- `addons/delivery/views/delivery_carrier_views.xml`: the Delivery Method form
  exposes `zip_prefix_ids` under Destination.

Core3 implementation:

- `services/ecommerce/migrations/20260922160000-171-ecommerce-delivery-prefix-matching.yaml`
  adds durable assignment storage and an index.
- `services/ecommerce/api/delivery-methods.yaml` adds the prefix options
  datasource, assignment validation, projected names, and write forms.
- `services/ecommerce/api/checkout.yaml` applies prefix matching to delivery
  options and authenticated/guest confirmation guards.
- `services/ecommerce/pages/delivery-methods.yaml` and
  `services/ecommerce/pages/checkout.yaml` expose the corresponding declarative
  controls.

Intentional boundary: provider rate calculation, country/state restrictions,
weight/volume limits, and shipment execution remain separate Odoo delivery
features and are not included in this smallest prefix-matching slice.
