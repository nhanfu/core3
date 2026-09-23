# Source comparison

| Odoo behavior | Core3 implementation | Classification |
| --- | --- | --- |
| `website_cookies_bar` layout template with policy link and two choices | `services/website/operations.yaml` declares the public banner contract; `services/website/module.ts` returns matching labels and `/cookie-policy` | implemented at service boundary; DOM consumer open |
| `CookiesBar.onAcceptClick` writes required/optional/timestamp JSON | `handlePublicCookieConsent` accepts `all`/`essential` and writes the same JSON fields to `website_cookies_bar` | implemented |
| 999-day consent lifetime | `WEBSITE_CONSENT_MAX_AGE = 999 * 24 * 60 * 60` and `Max-Age` response attribute | implemented |
| Optional cookies denied until `optional: true` | GET reports `optional_cookies_allowed` from Website setting and parsed consent | implemented at API boundary |
| Malformed legacy cookie is cleared | GET emits `Max-Age=0` for invalid consent JSON | implemented |
| Third-party tracker/iframe DOM watcher and consent-triggered client release | Not copied into the restricted Website service scope; existing public renderer does not consume the contract | missing/open |
