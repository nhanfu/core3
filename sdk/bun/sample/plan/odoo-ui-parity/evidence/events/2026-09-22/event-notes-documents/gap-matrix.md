# Gap matrix

| Requirement | Evidence | Status |
| --- | --- | --- |
| Source-backed bounded feature | Odoo model/view analysis and live capture | pass |
| Page/API YAML separation | matching `event-detail` page ids and focused contract assertion | pass |
| Permission boundary | `events.read` datasource/download and `events.write` mutations | pass |
| Durable migration | replayable DuckDB migration and restart test | pass |
| Workflow/state guard | optimistic row-version checks on edit/upload/remove | pass |
| Input safety | badge selection, image type/size, script rejection, length caps | pass |
| Desktop/mobile reference evidence | authenticated Odoo captures and hashes | pass |
| Full Events module sign-off | broader actor matrix and full responsive parity | open |
