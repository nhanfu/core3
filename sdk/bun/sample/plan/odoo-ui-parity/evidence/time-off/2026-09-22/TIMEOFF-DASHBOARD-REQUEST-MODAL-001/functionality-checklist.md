# Functionality checklist

| Case | Result |
| --- | --- |
| Stable Odoo action and modal target | PASS — source IDs and `target=new` asserted |
| Page/API `page.id` seam | PASS — `time-off-dashboard` is the only join |
| Active type lookup and write boundary | PASS — lookup is read-bound; form is `time_off.write` |
| Durable Draft creation | PASS — fixed Admin User and deterministic request ID persist in `leave_requests` |
| Invalid type/date/duration guards | PASS — deterministic 422 responses |
| Duplicate and overlap guards | PASS — deterministic 409 responses |
| Migration replay and fixed fixtures | PASS — `0.0.28` replay is idempotent and existing 2026 seed data is reused |
| Authenticated Odoo desktop/mobile visual comparison | BLOCKED — `core3_reference` resolves to Discuss without Time Off |
