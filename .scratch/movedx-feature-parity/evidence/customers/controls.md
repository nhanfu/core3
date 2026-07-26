# Customer CRM controls

## Local interaction checklist

- [x] The page header renders `Kinh doanh › Khách hàng` above the list controls.
- [x] `+ Thêm khách hàng` shares the page-header row and is right aligned.
- [x] The header renders the `Phạm vi xem: Toàn công ty` scope pill.
- [x] Primary customer cells render the reference building SVG avatar and legal-name subtitle.
- [x] Customer rows expose the reference `Loại` and `Người tạo` metadata columns.
- [x] The grid renders a server-page-aware row-number column after selection.

- [x] Advanced filters start collapsed behind the shared filter icon; help opens contextual list guidance.

- [x] Search and lifecycle tabs filter the customer list.
- [x] `Chi tiết` carries customer ID, kind, and back route through the SPA hash.
- [x] Detail renders identity, lifecycle, owner, visibility, primary phone/email,
  persisted contacts, and activity.
- [x] The normal add/edit forms refresh the contact grid and parent summary in
  place.
- [x] Selecting a primary contact demotes every sibling and synchronizes parent
  phone/email.
- [x] A current primary cannot be demoted without selecting another primary.
- [x] Deleting the primary promotes the oldest remaining contact and resyncs
  the parent.
- [x] Cross-parent mutations, invalid email, and raw contact-table patches are
  rejected.
- [x] Contact mutations atomically persist actor, action, resource ID, and
  detail in the activity trail.
- [x] 1440 x 1000 and 1024 x 768 have no document overflow.
- [x] Create, edit, delete, navigation, and datasource refreshes produce no
  console errors or failed responses.
- [x] Pagination defaults to 50 rows and offers server-backed 10/25/50/100 page-size choices.

## Evidence

- `reference-desktop.png`, `reference-tablet.png`: read-only reference list.
- `local-desktop.png`, `local-tablet.png`: local customer list.
- `local-detail-desktop.png`, `local-detail-tablet.png`: populated detail after
  creating and editing a primary contact.
