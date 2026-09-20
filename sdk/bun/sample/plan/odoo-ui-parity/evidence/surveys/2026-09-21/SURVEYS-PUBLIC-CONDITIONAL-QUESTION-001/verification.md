# Verification

The focused integration test proves the full service lifecycle: the branch
relation is present, a `No` answer omits the follow-up, next/previous skip it,
the cursor and answer survive a file-backed DuckDB reopen, concurrent submit
replays one idempotency row, and a matching `Yes` answer exposes the follow-up.
Wrong answer tokens are rejected before mutation.

The YAML test checks `page.id: surveys`, `surveys.public` on all public
actions, trigger metadata in the operations, and the renderer's merge binding.
The public regression remains green at 44 tests / 376 assertions. Lint and
scoped diff-check pass. The repository audit and complete migration rollback
gate remain blocked by unrelated/shared-state failures documented in
`blockers.md`.

Fresh browser attempts were bounded and all server processes were stopped.
The Core3 frontend rendered the exact 502 proxy error at both viewports
because its backend was not ready; Odoo redirected through `/` and `/odoo` to
the login route instead of an authenticated installed Survey fixture. No
browser or Odoo parity sign-off is claimed.
