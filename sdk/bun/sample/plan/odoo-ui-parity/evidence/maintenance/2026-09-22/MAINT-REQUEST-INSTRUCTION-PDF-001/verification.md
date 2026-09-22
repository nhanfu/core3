# Verification

The service contract is page-id joined: `maintenance-request-detail` owns the
presentation, `request-detail.yaml` owns the datasource/actions, and
`storage.yaml` owns the download route. Migration `0.0.14` is idempotent and
the focused test proves metadata survives a file-backed restart.

The browser gate is conditional. BrowserSkill connected successfully, but the
existing authenticated Odoo tab could not be borrowed after confirmation
remained pending. Consequently this batch reports API/storage evidence only
and leaves authenticated desktop/mobile visual parity open.
