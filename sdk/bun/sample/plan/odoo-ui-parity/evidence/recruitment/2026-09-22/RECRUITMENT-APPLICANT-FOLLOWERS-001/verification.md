# Verification

## Browser/reference

BrowserSkill/bsk used browser instance `245ea108` with the existing
authenticated Odoo session. Credentials, cookies, and tokens were not
extracted or recorded. The session was stopped during finalization.

The live reference blocker was observed at the requested route on desktop and
mobile:

| Requested state | Capture | Dimensions | SHA-256 | Result |
| --- | --- | --- | --- | --- |
| Odoo desktop 1440x900 | `/tmp/core3-odoo-parity/recruitment-followers-20260922/odoo-blocker-desktop-1440x900.png` | 1440x719 content viewport | `99bdb4b02d11b4926e84c6d25aff3bc98b8c5feb758d4a5926179f349aa2f5ce` | Discuss/OdooBot shell |
| Odoo mobile 390x844 | `/tmp/core3-odoo-parity/recruitment-followers-20260922/odoo-blocker-mobile-390x844.png` | 390x844 | `6c4e6ae20b55afbd5175b1a52e1194f796995659804bf001cd7bcd5df06d1159` | mobile Discuss shell |

No Odoo follower records, modal, or feature screenshot was available; no
paired visual-parity claim is made.

## Core3 gates

Focused implementation tests, the 59-test Recruitment regression, targeted
ESLint, YAML audit, Vite frontend build, and Recruitment-owned diff check are
green. No authenticated Core3 browser capture is claimed for this batch: the
user requested finalization after the source/runtime gate, and no independent
Core3 runtime session was available for a truthful rendered capture. This is
separate from the live Odoo blocker above; neither surface receives a paired
visual-parity claim.
