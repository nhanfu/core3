# Source comparison

| Contract | Core3 implementation | Result |
| --- | --- | --- |
| `action_event_type` Event Template form | Existing template detail links to `/events/templates/tickets` | implemented |
| `event_type_ticket_ids` relation | `event_template_tickets` datasource scoped by template id | implemented |
| Ticket list fields | Sequence, name, description, derived limited flag, maximum attendees | implemented |
| Add/edit/delete relation rows | API-owned `events.templates.tickets.create/update/delete` mutations | implemented |
| Parent/line optimistic concurrency | Template and ticket row versions with stale guards | implemented |
| Stable persistence | Migration 038 and stable Exhibition ticket IDs | implemented |
| Live Odoo desktop/mobile comparison | Shared tab borrow timed out before action navigation | blocked |

Intentional bounded residuals are the live Odoo visual comparison, richer
inline list geometry, and broader template Questions/Notes relation editors;
they are not silently presented as complete parity.
