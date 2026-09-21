# Source comparison

| Odoo capability | Core3 owner | Result |
| --- | --- | --- |
| Notes & Documents form page | `services/events/pages/event-detail.yaml` notebook `notes` | Implemented |
| Badge dimension selection | `edit_event_detail` field and `badge_format` column | Implemented |
| Badge background image | page attachment controls; API upload/download/remove actions; storage metadata | Implemented |
| Ticket instructions HTML | page richtext field; API update and safety guard | Implemented |
| Internal note HTML/text | page textarea field; API update and safety guard | Implemented |
| Page/API separation | page and API both declare `page.id: event-detail` | Verified |
| Durable persistence | migration `20260922100000-034-event-notes-documents.yaml` | Verified |
