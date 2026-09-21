# Verification

## Core3 contract and persistence

- The visitor page and API both use `page.id: livechat-visitor-session`.
- The new public action retains `/im_livechat/cors/message/post` and uses
  `livechat.public`.
- A valid token inserts a visitor-authored timeline message, increments
  `message_count` and `row_version`, and refreshes the two public datasources.
- Wrong tokens, blank/overlong content, and closed sessions are rejected
  without a new message.
- The message and session counters survive a file-backed DuckDB restart.

## Authenticated browser/reference result

BrowserSkill used instance `245ea108` and the authenticated local Odoo
profile. The reference was reachable, but the public Live Chat route returned
Odoo Error 404 for `/im_livechat/support/1`; the authenticated launcher also
had no Live Chat application entry. This prevents exercising the source
composer, guest token, or message POST in Odoo.

Blocker captures are outside Git:

- `/tmp/odoo-livechat-public-message-blocker-desktop-20260922.png` — PNG,
  1916x833, authenticated Odoo 404 page.
- `/tmp/odoo-livechat-public-message-blocker-mobile-20260922.png` — PNG,
  1916x833 capture output after `iphone-14` emulation; the navigation was
  attempted at the 390x844 emulated viewport, but BrowserSkill reported the
  capture dimensions above.

The local Core3 runtime had the previously recorded Vite proxy/backend
failure (desktop 502 followed by backend stop and mobile connection refusal),
so no authenticated Core3 composer capture was produced. No visual-parity
claim is made. The BrowserSkill session is closed; `bsk session list --json`
returned an empty list.
