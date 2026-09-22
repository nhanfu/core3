# Events tag assignment — `EVENTS-EVENT-TAGS-001`

## Bounded slice

This slice implements the source-backed `event.event.tag_ids` relation from
Odoo 19. The local source declares `tag_ids` as a stored many-to-many field in
`addons/event/models/event_event.py` and renders it as the `many2many_tags`
widget in `addons/event/views/event_event_views.xml`.

Core3 keeps the Events page/API contract separated through `page.id:
event-detail`. It adds a durable `event_event_tags` relation, scoped tag
options, an Odoo-shaped relation editor, and permissioned add/remove actions.
Parent and relation row versions guard stale writes; duplicate, invalid,
closed-event, empty, transport, replay, and file-backed restart cases are
covered by `test/events_event_tag_links.integration.test.ts`.

## Verification

- Focused Events tag-link and Events regression tests: **8 passed, 71 assertions, 0 failures**.
- Migration replay and file-backed restart persistence: **passed**.
- Source mapping checks for `tag_ids` / `many2many_tags`: **passed**.
- The parent branch validation still requires the normal audit, frontend build,
  and diff checks before integration.

## Browser gate

BrowserSkill daemon instance `245ea108` was healthy. The authenticated user
tab `1770662590` was already borrowed by the active session `gdcs`; this
session did not retry, bypass, use Playwright, or access credentials. No live
Odoo desktop/mobile capture was produced and no visual-parity claim is made.
