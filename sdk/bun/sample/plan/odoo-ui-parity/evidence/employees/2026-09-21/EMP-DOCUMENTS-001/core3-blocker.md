# Core3 browser blocker

`bun run agent:module -- employees --port=3311` was attempted on the current
branch. The process exited before listening during global page discovery:

```text
PageSchemaError: Invalid page definition:
- components[2].title is not allowed
```

This is in concurrent Inventory page discovery, not in the Employees page or
API contracts. No Core3 screenshot or UI pass is claimed for this slice.
