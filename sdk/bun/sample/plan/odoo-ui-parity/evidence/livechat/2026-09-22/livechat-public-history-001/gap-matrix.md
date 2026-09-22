# Gap matrix

| ID | Gap | Impact | Follow-up |
| --- | --- | --- | --- |
| LH-001 | Core3 has no live transient bus consumer for this YAML action, so the notification is durable in the session timeline | Persistence differs from Odoo's transient bus message | Add a shared livechat bus/topic contract before replacing the durable fallback |
| LH-002 | Core3 stores page history as safe text rather than Odoo's rendered HTML list of links | Links are not clickable in the bounded message | Add escaped link-list rendering to the shared chatter renderer |
| LH-003 | Authenticated browser evidence was blocked by tab-borrow confirmation | No desktop/mobile visual parity claim | Repeat one authenticated capture when the shared tab can be borrowed |
| LH-004 | The public visitor history command is represented on the operator session detail, not a public widget shell | Public widget end-to-end behavior remains open | Exercise the embedded widget after the reference addon is available |
