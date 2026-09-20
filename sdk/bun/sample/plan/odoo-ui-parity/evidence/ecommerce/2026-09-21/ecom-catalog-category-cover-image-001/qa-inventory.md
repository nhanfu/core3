# QA inventory

| Case | Boundary | Result |
| --- | --- | --- |
| Deterministic migration replay | Accessories cover metadata and bytes | pass |
| Category list/detail contract | Separate page/API YAML pairs | pass |
| Upload | Valid `image/png`, metadata and row version | pass |
| Replace | Second valid upload replaces metadata and bytes | pass |
| Download | Authenticated exact bytes and MIME | pass |
| Remove | Cover metadata and storage projection cleared | pass |
| Permission | Read/write actions declare Ecommerce permissions | pass |
| Company | Wrong-company fixture is rejected without mutation | pass |
| Validation | Non-image/empty/oversized metadata rejected | pass |
| Concurrency | Stale upload/remove cannot overwrite current row | pass |
| Restart | Reopen database and attachment storage, then download | pass |
| Core3 desktop/mobile | Authenticated rendered evidence | blocked: ports/browser runtime unavailable |
| Odoo desktop/mobile | Exact Website Sale comparison | blocked: `/shop` HTTP 404 |

This inventory verifies the bounded service/API lifecycle but does not close
the Ecommerce module-wide sign-off gates.
