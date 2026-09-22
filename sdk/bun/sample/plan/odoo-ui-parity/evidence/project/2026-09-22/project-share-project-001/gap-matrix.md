# Gap matrix

| Stable ID | Odoo gap before change | Core3 change | Acceptance evidence |
| --- | --- | --- | --- |
| PROJECT-SHARE-PROJECT-001 | Project form had no Share Project action | Added manager-only server-form modal and API mutation | Focused source/contract test |
| PROJECT-SHARE-PROJECT-001-DATA | No durable collaborator share record | Added idempotent project_shares migration with fixed-date seed | Persistence assertion |
| PROJECT-SHARE-PROJECT-001-SAFETY | No share eligibility or concurrency boundary | Added active/template/privacy, stale project, email, mode, and duplicate guards | Guard assertions |
| PROJECT-SHARE-PROJECT-001-VISUAL | Live desktop/mobile comparison unavailable | Capture gate remains open; no visual claim | Browser blocker record |
