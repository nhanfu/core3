# Source comparison

Odoo 19 source revision: `65975996`.

| Odoo source | Core3 contract | Result |
| --- | --- | --- |
| `addons/event/models/event_event.py:73-76` declares `active` with default `True` | Migration 044 adds `events.active` with default `TRUE`, backfills existing rows, and seeds a fixed inactive event | PASS |
| `addons/event/views/event_event_views.xml:44-46` renders the Archived ribbon when inactive | Event detail projects `active`, shows a read-only Active field, and exposes Restore when inactive | PASS, bounded to existing shared form status rendering |
| `addons/event/views/event_event_views.xml:310-312` declares the Archived search filter | `/events` uses `default_filters.active=active` and `event_active_states` with active/archived options | PASS |
| Odoo generic archive/unarchive writes the record active flag | YAML mutations `events.records.archive` and `events.records.unarchive` require `events.write`, check row version, update active, and increment the version | PASS |

The Core3 implementation is service-owned YAML and does not copy Odoo
frontend code. The source action is record archive state rather than a new
Events model or route, so the existing `/events` and `/event-detail` page IDs
remain the join boundary.
