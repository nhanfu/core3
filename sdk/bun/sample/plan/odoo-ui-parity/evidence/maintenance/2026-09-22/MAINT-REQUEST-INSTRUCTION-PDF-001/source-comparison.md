# Source comparison

| Odoo source behavior | Core3 result |
| --- | --- |
| `instruction_type` offers PDF, Google Slide, and Text | Request instruction edit contract exposes all three values; PDF selection requires an uploaded PDF. |
| `instruction_pdf` uses the `pdf_viewer` widget | Detail page exposes an `application/pdf,.pdf` upload panel with a Maintenance-owned PDF attachment source and download action. |
| PDF is persisted on `maintenance.request` | Migration `0.0.14` persists filename, MIME, size, storage key, uploader, and deterministic update timestamp on `maintenance_requests`. |
| Active request and valid PDF content are required | Upload guards return stable 404, 409, and 422 responses and reject non-PDF, empty, oversized, stale, missing, and archived uploads without partial writes. |
