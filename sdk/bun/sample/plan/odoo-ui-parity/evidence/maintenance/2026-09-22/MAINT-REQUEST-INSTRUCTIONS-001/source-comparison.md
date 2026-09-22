# Source comparison

Odoo's Maintenance Request form contains an Instructions notebook. It offers
Text, Google Slide, and PDF instruction modes; Text stores HTML, Google Slide
stores a public URL, and PDF uses a binary PDF viewer widget.

Core3 now exposes the same Instructions notebook boundary for the supported
Text and Google Slide modes. `update_maintenance_request_instructions` is a
`maintenance.write` page/API action with active-request, row-version, mode,
content, URL, and no-partial-write guards. The migration backfills the new
text field from the existing legacy `instructions` value and preserves the
detail compatibility alias.

PDF binary upload/viewer behavior is deliberately deferred to a separate
attachment/storage slice; the page does not present an unsupported PDF claim.
