# INV-TRANSFER-LABELS-001 blockers

## Core3 browser blocker

`bun run agent:module -- inventory --port=4315` exits before listening because shared discovery fails in an unrelated owner scope:

```text
PageSchemaError: Invalid page definition:
- actions[4].fields is not allowed
at packages/server/src/yaml/schema.ts:315
at packages/server/src/discovery.ts:170
```

The failing file is `services/ecommerce/api/wishlist.yaml`. Inventory did not modify that file or any other module. Authenticated Core3 desktop/mobile screenshots are therefore not claimed for this wave.

## Odoo blocker

The supplied Odoo account was not used for a mutation. The source contract is in `source-comparison.md`; authenticated Product Labels modal/PDF capture remains open until a reachable transfer exposes the action and the account has the required stock access.
