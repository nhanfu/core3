# Gap matrix

| Stable ID | Odoo gap before change | Core3 change | Acceptance evidence |
| --- | --- | --- | --- |
| PROJECT-CONFIGURATION-001 | No Configuration > Projects menu or action | Added manager menu, `/project-configuration` page/API, and project detail form | Focused contract test |
| PROJECT-CONFIGURATION-001-DATA | Existing projects had no durable sequence field | Added migration `20260922120000-020-project-configuration-action.yaml` with deterministic backfill | Migration/reload test |
| PROJECT-CONFIGURATION-001-CRUD | No configuration-scoped project CRUD/archiving boundary | Added create/edit/archive/restore/delete YAML mutations | 4 focused tests, 29 assertions |
| PROJECT-CONFIGURATION-001-SAFETY | No explicit dependency or stale guards | Added duplicate, required, non-negative-hours, missing, dependency, and row-version guards | Mutation assertions |
| PROJECT-CONFIGURATION-001-VISUAL | Live desktop/mobile comparison unavailable | Capture gate remains open; no visual claim | Browser blocker record |
