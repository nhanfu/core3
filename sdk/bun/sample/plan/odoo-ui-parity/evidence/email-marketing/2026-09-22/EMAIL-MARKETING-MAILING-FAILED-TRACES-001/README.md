# Email Marketing failed mailing traces — bounded evidence

Stable action: Odoo `MailingMailing.action_view_traces_failed`, source revision
`659759969d535d286b656c96b675e4612b925ddd` (`65975996`).

This read-only slice maps the failed-trace action through the existing
`mailing-detail` page/API seam and scopes the existing technical Mailing Traces
datasource by mailing and `trace_status=error`. No persistence was needed.

Supporting records: `odoo-analysis.md`, `source-comparison.md`, `gap-matrix.md`,
`functionality-checklist.md`, `test-results.md`, `browser-check.md`, and
`verification.md`.
