# Verification

Date: 2026-09-22. Browser instance: `245ea108`. Browser commands used the
BrowserSkill session and no credentials, cookies, or tokens were extracted.

## Odoo reference

Authenticated `http://localhost:8069`, database `core3_reference`, was opened
through the Point of Sale app and Orders menu. The live Orders list showed four
posted orders, each with an empty Invoice Status. Opening
`Furniture Shop - 000004` showed the create `Invoice` header action, the
`Return Products` action, and the Posted status, but no Invoice smart button.

The positive linked-invoice state is blocked by the reference fixture itself:
creating or changing reference data was not required to validate the source
contract, and no positive Odoo capture is claimed.

## Core3

The POS-only runtime at `http://127.0.0.1:4000` returned `/api/modules` 200
and included `/point-of-sale/invoice-detail` with page id
`pos-invoice-detail`. The protected API/page probe returned 401 and the browser
rendered `Failed to load page — API route not found` because browser instance
`245ea108` had no reusable local Core3 QA login session. The available browser
session was authenticated to Odoo, not Core3.

Therefore no authenticated Core3 desktop/mobile screenshot, smart-button
click-through, responsive assertion, or visual-parity claim is made. This is an
environment/session blocker; the focused service contract and restart tests
remain passing. The bsk session was stopped after the checks.
