# Verification

## Odoo authenticated evidence

BrowserSkill instance `245ea108` used an authenticated task-created tab against `http://localhost:8069/odoo/crm`. No record was saved or mutated. The New opportunity form was used to inspect the generic CRM lead chatter controls.

| View | Capture | SHA-256 |
| --- | --- | --- |
| Desktop 1916x833 | `/tmp/core3-odoo-parity/crm-lead-chatter-20260922/odoo-lead-chatter-desktop.png` | `64b1a9425243c86f7aeea5e6e42953ac84a8bf47fbdb7b1b1af1db7d32ed49c7` |
| Mobile 390x844 | `/tmp/core3-odoo-parity/crm-lead-chatter-20260922/odoo-lead-chatter-mobile.png` | `b3ffde0a802cdc711b336c0b41dc458c37496484e94c6e635c7d5289b24853c5` |
| Mobile scrolled composer 390x844 | `/tmp/core3-odoo-parity/crm-lead-chatter-20260922/odoo-lead-chatter-mobile-composer.png` | `410d2ff542a376000461e2d06f14c4919ebf4b6f0d45c79c7630575aee63577e` |

Observed desktop/mobile controls include `Send message`, `Log note`, `Activity`, `Search Messages`, and `Attach files`; the mobile composer is visible after scrolling below the lead fields.

## Core3 verification blocker

Core3 runtime `http://localhost:4190` authenticated successfully as the local demo admin, but `/crm/lead-detail?id=crm-demo-001` returned HTTP 500. Browser network evidence: `GET /api/pages/lead-detail?lc=en&id=crm-demo-001` → 500. Server evidence:

`Module service is not registered: yaml.service.base` from `repository.ts` → `datasource-runtime.ts` while prefetched lead-detail sources resolve `crm_contacts_detail`.

The CRM-only runner does not register the Base dependency required by the existing contact lookup, so no Core3 authenticated desktop/mobile visual claim is made. A dependency-aware runtime was attempted with CRM/Base/Order/Ecommerce, but the local server startup path was not completed before handoff; this remains an environment/runtime blocker, not a product-pass claim. BrowserSkill sessions were stopped and the connected browser reported no active sessions afterward.
