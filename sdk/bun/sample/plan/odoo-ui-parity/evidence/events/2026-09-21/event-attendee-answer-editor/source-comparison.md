# Source comparison

| Odoo contract | Core3 implementation | Status |
| --- | --- | --- |
| Registration Questions one-to-many on attendee form | `pages/attendee-detail.yaml` `LineItemGrid`, variant `odoo_x2many` | implemented |
| Question and answer lookup relations | API-owned question and choice lookup datasources | implemented |
| Suggested answer or text answer values | `suggested_answer_id` / `text_answer`, with display projection | implemented |
| Durable answer persistence | migration 033 adds relation and row version columns | implemented |
| Odoo row editing guards | permissioned YAML line mutations with relation, value, duplicate, and stale guards | implemented |
| Odoo mobile kanban projection | Core3 shared responsive line-item renderer | implemented by contract; runtime visual check blocked |
| Odoo chatter, mail history, and sale/order links | existing Core3 attendee surface remains bounded | residual, outside this slice |
