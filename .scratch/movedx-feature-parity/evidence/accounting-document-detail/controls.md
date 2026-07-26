# Accounting document detail controls

## Local interaction checklist

- [x] Debit-note list navigation carries `id`, `kind`, and `back` through the
  SPA hash.
- [x] One generic detail surface resolves debit notes, payment requests,
  advances, and settlements with kind-scoped queries.
- [x] Draft documents expose add, edit, and delete line controls; Pending
  Approval documents hide all line mutation controls.
- [x] The normal add form derives the line total and refreshes the header from
  `32,600,000 VND` to `33,700,000 VND` in place.
- [x] UI deletion removes the child row and restores the seeded header total.
- [x] Named line mutations are parent-scoped and Draft-only, and their audit
  events persist transactionally with actor and resource detail.
- [x] Forged header totals, non-Draft mutations, repeat deletes, and direct
  raw-line patches are rejected.
- [x] 1440 x 1000 and 1024 x 768 have no document overflow; the tablet grid
  owns horizontal scrolling.
- [x] Login, route navigation, mutations, and datasource refreshes produce no
  console errors or failed responses.

## Local evidence

- `local-desktop.png`: clean seeded debit note after one UI line addition,
  derived total, and refreshed audit timeline.
- `local-tablet.png`: the same state at 1024 x 768 with contained grid
  scrolling.
