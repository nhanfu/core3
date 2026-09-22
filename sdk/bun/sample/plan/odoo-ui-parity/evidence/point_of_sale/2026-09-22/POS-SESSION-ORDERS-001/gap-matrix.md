# Gap matrix

| Stable ID | Gap | Scope decision | Evidence |
| --- | --- | --- | --- |
| POS-SESSION-ORDERS-001 | Odoo session Orders stat action had no Core3 equivalent; Core3 only showed inline rows | Add the session stat action and a read-only session-scoped list/API projection. Reuse durable orders and existing detail route. Do not add order CRUD or a second order detail implementation. | focused integration test; audit; verification blocker |
