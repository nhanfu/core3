# Verification

The focused test proves the page/API join and `surveys.public` declarations,
the deterministic comment settings, comment-only completion of a required
choice, durable answer-data persistence after reopening DuckDB, concurrent
idempotent submission, rejection of a comment on a question that disallows
comments, and wrong-token denial.

The public regression remains green at 46 tests / 399 assertions. ESLint,
audit, and scoped diff-check pass. The migration rollback suite remains
blocked by DuckDB dependent entries and is documented separately; no unrelated
module files were changed.

Fresh browser processes were bounded and stopped. Core3's frontend probe
returned the exact 502 caused by its unavailable backend at both viewports.
Odoo redirected the synthetic public token through the host login route; no
authenticated installed Survey reference fixture was available. No browser or
paired Odoo parity sign-off is claimed.
