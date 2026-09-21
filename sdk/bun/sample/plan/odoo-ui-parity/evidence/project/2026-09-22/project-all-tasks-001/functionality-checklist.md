# Functionality checklist

| Case | Result | Evidence |
| --- | --- | --- |
| Menu/action identity and `/all-tasks` route | pass | focused integration test |
| Page YAML has no datasource and API binds by `page.id` | pass | focused integration test |
| Source view order represented | pass | focused integration test and Odoo source trace |
| Open-task default excludes Done/Cancelled | pass | repository query assertion |
| All Tasks search/filter and deterministic ordering | pass | repository query assertion |
| My Tasks current-assignee scope | pass | repository query assertion |
| Empty and stable 503 datasource branch | pass | repository query assertion |
| File-backed restart-equivalent read | pass | repository reopen assertion |
| Authenticated Odoo desktop/mobile route and captures | blocked | BrowserSkill tab borrow timeout |
| Authenticated Core3 desktop/mobile route and captures | not run | runtime visual pass not started |
