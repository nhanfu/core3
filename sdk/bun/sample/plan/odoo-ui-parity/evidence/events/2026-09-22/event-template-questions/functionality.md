# Functionality evidence

The focused test verifies:

1. Odoo source mapping, page/API separation, Questions notebook slot,
   datasource discovery, and `events.write` action declarations.
2. Deterministic Name/Email/Phone links for the Exhibition template.
3. Available-question filtering for an unlinked Dietary requirements question.
4. Add a line persistence, sequence allocation, parent row-version advance,
   duplicate rejection, and invalid-question rejection.
5. Empty projection, stale-parent rejection, Remove persistence, replay, and
   file-backed restart persistence.

Related template, communication, ticket, and full Events regression tests were
run without changing their existing behavior. The feature is bounded to the
template relation; it does not claim template Notes, broader Event module
sign-off, or external mail delivery.
