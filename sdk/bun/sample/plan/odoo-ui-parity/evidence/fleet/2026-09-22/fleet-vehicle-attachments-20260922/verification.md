# Verification

The Odoo browser session on instance `245ea108` reached the authenticated
Discuss shell in `core3_reference`; Fleet was absent from the app launcher and
direct Fleet navigation fell back to the non-Fleet shell. Desktop and mobile
blocker captures are recorded under `/tmp/core3-odoo-parity/` and are not
visual parity evidence. SHA-256 values are `c3f5499e...` (desktop) and
`ab25e5d9...` (mobile).

Core3 authenticated verification succeeded on the isolated Fleet runtime at
`http://localhost:4323`: the existing QA session signed in, opened Fleet >
Fleet, opened Pool Vehicle 01, and rendered the seeded Attachments panel at
desktop 1916x833 and mobile 390x844. Captures are committed here:

- `core3-desktop.png` — SHA-256 `d1769baf...`
- `core3-mobile.png` — SHA-256 `407bbd33...`

The panel showed `vehicle-registration.pdf`, its size, Download controls,
Add attachment, and Remove. A real `bsk upload` attempt was blocked by the
browser extension's file-URL permission (`Not allowed`), so no upload success
is claimed from the browser. The authenticated API/persistence test remains
the upload/remove proof. The browser session was stopped and the runtime was
stopped after capture.
