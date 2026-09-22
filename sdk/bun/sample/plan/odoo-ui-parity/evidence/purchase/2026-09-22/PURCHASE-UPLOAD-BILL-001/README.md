# Purchase Upload Bill evidence

Stable ID: PURCHASE-UPLOAD-BILL-001.

This bounded slice adds the YAML-first upload_purchase_bill page/API action,
durable upload metadata, Accounting Vendor Bill creation, Purchase bill
linkage, permissions, row-version/state/duplicate/file/actor guards, and
atomic Accounting-failure handling.

Focused validation passed 5 tests and 28 assertions. BrowserSkill instance
245ea108 was connected, but authenticated Odoo tab 1770662590 remained
user-scoped while the owned borrow request stayed pending. No credentials
were accessed or recorded, no independent login was used, and no fresh
desktop/mobile capture was possible. This package therefore makes no
visual-parity claim.

Remaining bounded gaps: binary attachment download, OCR/vendor-value
extraction, and multi-vendor batch upload.
