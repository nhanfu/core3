# Verification — `PURCHASE-ORDER-SECTION-001`

The focused section suite created a durable zero-total section on `po-demo-001`,
reloaded its page-owned lines, edited the section name, deleted it, and checked
that each mutation advanced the parent row version without changing the order
total. It also verified the seeded `po-demo-008` section, migration replay,
invalid blank input, stale parent/line versions, locked confirmed orders, and
the refusal to use section actions against product lines.

Browser verification is **blocked**. BrowserSkill instance `245ea108` was
healthy, but the borrow confirmation for signed-in Odoo tab `1770662590` timed
out before the tab entered agent scope. No desktop/mobile browser capture was
possible, so this evidence does not claim visual parity.
