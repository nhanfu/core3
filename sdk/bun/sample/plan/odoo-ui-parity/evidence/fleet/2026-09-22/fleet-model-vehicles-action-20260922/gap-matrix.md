# Gap matrix

| Area | Result | Evidence |
| --- | --- | --- |
| Odoo source/action identity | supported | `odoo-analysis.md`, focused test |
| Core3 navigation | supported | `model-detail.yaml`, focused test |
| Durable model relation | supported | migrations `046` and `047`, focused test |
| Scoped vehicle query | supported | `vehicles.yaml`, focused test |
| CRUD/workflow mutation | not applicable to this read-only stat action | Existing vehicle/model slices retain their own mutation coverage |
| Stale write guard | not applicable to this read-only stat action | No mutation is introduced |
| Authenticated visual comparison | blocked | `browser-check.md` and blocker captures |
| Full Fleet completion | deferred | Module remains conditional and unsigned-off |
