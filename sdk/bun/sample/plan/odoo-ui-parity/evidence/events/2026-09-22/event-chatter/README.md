# Event chatter message and internal note

- Feature ID: `EVENT-CHATTER-001`
- Date: 2026-09-22
- Odoo source: `/home/nhanjs/projects/odoo`, local Odoo 19 revision `65975996`
- Reference: `http://localhost:8069`, database `core3_reference`, browser instance `245ea108`
- Core3 route: `/events/event-detail?id=event-demo-001`
- Core3 fixture: `event-demo-001` / Design Fair Los Angeles

| Artifact | SHA-256 | Meaning |
| --- | --- | --- |
| `odoo-desktop-send-message.png` | `68829e1556857c829f75aa83d8da9abb76724539a1c4584f5bc229fb8c3a3237` | Authenticated Odoo composer, 1916x833 |
| `odoo-mobile-send-message.png` | `ab97e5e6cea770ddd84ac257e48755656e71b521e8d4bb6c227d31a9e343d3e0` | Authenticated Odoo composer, 390x844 |

The Core3 mobile/desktop browser capture is intentionally omitted: the module
runner reached port 4026, but the requested bsk browser sessions were closed
before a new authenticated Core3 interaction pass. No Core3 visual-parity
claim is made.

See [odoo-analysis.md](odoo-analysis.md),
[source-comparison.md](source-comparison.md),
[functionality-checklist.md](functionality-checklist.md),
[test-results.md](test-results.md), [verification.md](verification.md), and
[gap-matrix.md](gap-matrix.md).
