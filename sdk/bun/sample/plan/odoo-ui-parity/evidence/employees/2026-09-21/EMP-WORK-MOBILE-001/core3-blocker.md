# Core3 browser blocker

`bun run agent:module -- employees --port=3312` was attempted on the current
branch. The process exited before listening during global page discovery:

```text
PageSchemaError: Invalid page definition:
- components[0].search.categories is not allowed
- components[0].search.or locations... is not allowed
```

The error is in concurrent Inventory page YAML, not the Employees page or API
contract. No Core3 screenshot or UI pass is claimed for this slice.
