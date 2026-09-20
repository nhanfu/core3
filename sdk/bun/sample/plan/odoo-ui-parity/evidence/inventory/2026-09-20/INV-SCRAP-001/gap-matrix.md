# Gap matrix

| Gap | Before slice | After slice | Evidence |
| --- | --- | --- | --- |
| Scrap validation only changed state | open | Done/date and one durable Product Move are persisted | focused test, Core3 detail captures |
| Existing Done fixtures lacked move relation | open | migration `0.0.25` backfills deterministic relations | migration/restart test |
| Product Moves had no detail surface | open | API datasource + read-only detail line grid | Core3 desktop/mobile detail |
| Operator could not be tested at API boundary | open | read page succeeds; create action returns 403 for read-only user | focused permission test |
| Odoo source/action comparison | open | authenticated list/kanban comparison captured | Odoo desktop/mobile captures |
| Stock Operation/replenishment/chatter full parity | open | explicitly residual and not claimed | source-comparison.md |
