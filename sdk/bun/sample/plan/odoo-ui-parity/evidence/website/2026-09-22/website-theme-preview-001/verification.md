# Browser verification and blockers

Requested browser: instance `245ea108`; Odoo service:
`http://localhost:8069`; database: `core3_reference`.

The existing Odoo tab borrow remained pending confirmation during this wave.
The other available authenticated tab was CRM and did not expose Website. The
shared authenticated actor therefore could not reach `theme_install_kanban_action`
or `theme_view_form_preview`. Per the task instruction, browser work stopped
without retrying or bypassing the pending borrow. No Odoo or Core3 screenshots
are claimed, and no paired visual-parity sign-off is made.

Functional evidence is from the focused integration suite: the preview page/API
join, read permission, deterministic theme tokens, installed/preview public
operation behavior, and file-backed restart/migration replay all pass.
