# Functionality checklist

| Case | Result |
| --- | --- |
| Four vehicle statusbar stages are declared and action-bound | PASS |
| Page/API contracts join by `page.id: vehicle-detail` | PASS |
| Direct status write persists and increments `row_version` | PASS |
| Invalid status is rejected with 422 and no partial write | PASS |
| Stale row version is rejected with 409 | PASS |
| Wrong-company vehicle is rejected with 403 | PASS |
| Live Odoo desktop/mobile action capture | BLOCKED before borrow |
| Core3 authenticated desktop/mobile comparison | NOT CLAIMED |
