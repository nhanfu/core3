# Maintenance Request PDF instruction widget

Feature ID: `MAINT-REQUEST-INSTRUCTION-PDF-001`

Odoo source defines `instruction_type=pdf`, `instruction_pdf`, and the
`pdf_viewer` widget in `addons/maintenance/models/maintenance.py` and
`views/maintenance_views.xml`. Core3 maps that behavior through the
`maintenance-request-detail` page/API pair, local attachment storage metadata,
and a permissioned PDF upload/download contract.

Screenshots are intentionally absent: BrowserSkill connected to Chrome, but
borrowing the existing authenticated Odoo tab did not complete within the
bounded confirmation window. No visual-parity claim is made.
