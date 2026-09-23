# Gap matrix

| Gap | Required change | Status/evidence |
| --- | --- | --- |
| Public Website needs a source-backed consent state | Add YAML public datasource/action operations and `/api/public/website/cookie-consent` | complete; focused integration test |
| Consent must survive navigation/browser restart | Use the Odoo cookie name, JSON shape, path, and 999-day Max-Age | complete; cookie replay assertion |
| Invalid/legacy preferences must not grant optional cookies | Parse and expire invalid values | complete; invalid-cookie assertion |
| Cookie-bar setting is Website-scoped | Resolve `website_id`, default to deterministic Storefront, and reject missing/disabled sites | complete; scope/error assertions |
| Actual banner DOM/toggle and optional iframe warning | Add a public Website UI consumer and client interactions | open; outside this worker's allowed Website service/YAML/test scope |
| Authenticated desktop/mobile Odoo comparison | Borrow the shared authenticated tab and capture both viewports | blocked by BrowserSkill borrow confirmation; no visual claim |
