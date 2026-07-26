# Partner CRM controls

## Local interaction checklist

- [x] Partner-type tabs and search filter the list.
- [x] `Chi tiết` carries partner ID, kind, and back route through the SPA hash.
- [x] The shared CRM detail component renders partner classification, owner,
  visibility, primary phone/email, contacts, and activity.
- [x] Partner contact actions use the FK-backed partner table through validated
  `crm.contacts.*` actions, never a browser-owned table name.
- [x] Primary-contact and parent synchronization rules are shared with
  customers.
- [x] 1440 x 1000 and 1024 x 768 have no document overflow.
- [x] Navigation and datasource rendering produce no console errors or failed
  responses.

The read-only partner reference still needs desktop/tablet recapture before
final visual-parity signoff.

## Local evidence

- `local-desktop.png`, `local-tablet.png`: local partner list.
- `local-detail-desktop.png`, `local-detail-tablet.png`: populated shared
  partner detail and contact grid.
