# Gap matrix

| Gap | Change | Verification |
| --- | --- | --- |
| No theme catalog or current-site state | Add `website_themes`, `theme_id`, and `theme_revision` migrations plus deterministic two-site fixtures | `website_themes.integration.test.ts`, restart assertion |
| No Theme Manager page/API contract | Add `pages/themes.yaml` and matching `api/themes.yaml` | discovery/page-id assertion |
| No theme lifecycle actions | Add choose/update/remove YAML actions with Website row-version and state guards | workflow and stale/duplicate/not-selected assertions |
| Existing Website detail mixed page/API contract | Move `website_detail` datasource to `api/website-detail.yaml` and bind `Pick a Theme` header action | page/API discovery and browser route |
| Odoo Website unavailable to shared actor | Capture desktop/mobile diagnostics and record blocker | `verification.md` |
| Core3 mobile capture unavailable after session closure | Keep only valid desktop image; omit mobile claim | `verification.md`, QA ledger |
