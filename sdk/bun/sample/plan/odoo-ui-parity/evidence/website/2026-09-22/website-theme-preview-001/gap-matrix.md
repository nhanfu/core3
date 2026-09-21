| Gap | Change | Verification |
| --- | --- | --- |
| Theme Manager had no preview/form route | Add `website-theme-preview` page/API and Preview row action | Contract test checks matching page ID, route, Odoo source anchors, and action |
| Theme selection had no visible public effect | Add durable theme color tokens and public operation joins | Installed/preview token query and public page assertions |
| Theme effects could be stale across process restart | Add schema/data migrations and file-backed restart coverage | Close/reopen/replay test |
| Odoo Website actor/reference unavailable | Record exact browser blocker | `verification.md`; no visual sign-off |
