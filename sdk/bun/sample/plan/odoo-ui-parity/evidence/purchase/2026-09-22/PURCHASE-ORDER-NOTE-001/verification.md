# Verification — `PURCHASE-ORDER-NOTE-001`

The focused note suite created a durable zero-total note on `po-demo-001`,
reloaded the page-owned lines, edited the note text, deleted it, and checked
that each mutation advanced the parent row version without changing the order
total. It also verified the seeded `po-demo-008` note, migration replay,
invalid blank input, stale parent/line versions, confirmed-order rejection,
and refusal to use note actions against product lines.

Browser verification is **blocked**. BrowserSkill instance `245ea108` was
healthy, but the required borrow confirmation for signed-in Odoo tab
`1770662590` did not complete in session `cqvt`; the tab remained in user scope
when checked, and the session was stopped. No desktop/mobile browser capture
was possible, so this evidence does not claim visual parity.
