# Event chatter followers

- Feature ID: `EVENTS-EVENT-FOLLOWERS-001`
- Date: 2026-09-23
- Odoo source: `/home/nhanjs/projects/odoo`, Odoo 19
- Reference: `http://localhost:8069`, database `core3_reference`
- Core3 route: `/events/event-detail?id=event-demo-001`
- Core3 fixture: `event-demo-001`

| Artifact | SHA-256 | Meaning |
| --- | --- | --- |
| `odoo-desktop-followers.png` | `8e6d3c3f3d87e0c0f159f8ea6308fd38e91e5e0dc67d9b2b42fd782e1d686afa` | Authenticated Odoo follower menu at 1916x833 |
| `odoo-mobile-followers.png` | `cf4e1c79fbc7c68f1dd437a70c12fc0e061b6c6b372fdf673dfacd1fb14e6f4f` | Authenticated Odoo follower menu at 390x844 |

The BrowserSkill task-owned tab was authenticated and loaded the same Odoo
service/database. No credentials were accessed or stored. A paired Core3
browser capture was not made in this checkpoint, so this evidence does not
claim visual parity or full Events sign-off.

See [odoo-analysis.md](odoo-analysis.md),
[source-comparison.md](source-comparison.md),
[functionality-checklist.md](functionality-checklist.md),
[test-results.md](test-results.md), and [verification.md](verification.md).
