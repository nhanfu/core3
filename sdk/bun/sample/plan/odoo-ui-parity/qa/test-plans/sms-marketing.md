# SMS Marketing detailed QA test plan

Module: sms-marketing  
QA owner: sms-marketing-qa  
Developer owner: sms-marketing module owner  
Reference addon/version: mass_mailing_sms, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`sms-marketing.md`](../../sms-marketing.md); executed
evidence is recorded in [`../sms-marketing.md`](../sms-marketing.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| SMS campaigns | campaign list/detail routes | Draft/queue/sending/sent lifecycle, recipients, content, scheduling and cancellation |
| Mailing lists/contacts | lists, contacts and detail routes | List CRUD, subscriptions, opt-out/resubscribe, blacklist and valid-SMS state |
| Reporting | SMS analysis route | Graph/pivot/list filters, dates, search and read-only reports |
| Configuration | settings and reason/configuration routes when enabled | Manager settings, opt-out reasons, validation and transport states |

Actors are SMS Marketing Manager, Marketing User, contact/list operator,
ordinary user, wrong-company user and unauthenticated user. Fixtures use stable
campaigns, lists, contacts, subscriptions, opt-out/blacklist states, reports
and deterministic timestamps. Mutations use isolated databases and generated
IDs.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| SMS-FUNC-001 | Campaigns | Search/filter/detail, create/edit, required content/recipient validation and stale guards persist | pass: focused suite |
| SMS-FUNC-002 | Campaign lifecycle | Schedule, send, cancel and completion transitions enforce state and permission guards | pass at contract level; browser workflow planned |
| SMS-FUNC-003 | Lists/contacts | List CRUD, subscriptions, opt-out/resubscribe and blacklist state remain linked and persistent | pass: focused suite |
| SMS-FUNC-004 | Reporting | Analysis exposes deterministic SMS-only rows, date/search/filter and read-only boundaries | pass: focused suite |
| SMS-FUNC-005 | Empty/error/not-found | Empty, missing, forbidden and transport-error states are explicit | pass: focused suite |
| SMS-FUNC-006 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate campaigns, contacts or subscriptions | planned restart/migration gate |
| SMS-FUNC-007 | Upload/import/export | Exercise recipient import, attachment/content upload, export and exposed print actions | planned browser interaction gate |
| SMS-FUNC-008 | Delivery traces and retry | Open readonly SMS trace list/form from a mailing, filter failed traces, retry a sent mailing with failures, and verify attempt state persists after restart | pass: `sms_marketing_delivery_retry.integration.test.ts`; browser/Odoo visual gate blocked by reference addon not installed |
| SMS-FUNC-009 | Blacklisted phone numbers | Open the configuration list/form, filter archived numbers, normalize and persist a phone number, blacklist/unblacklist it with a reason, and reject stale or invalid mutations | pass: `sms_marketing_phone_blacklist.integration.test.ts`; paired Odoo screen blocked by reference addon not installed |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| SMS-WF-001 | Campaign lifecycle | Draft → In Queue → Sending → Sent updates row versions atomically and rejects invalid transitions | pass at contract level |
| SMS-WF-002 | Cancel/retry | Cancel only permitted draft/queued campaigns; retry failure preserves audit state | pass at contract level |
| SMS-WF-003 | Recipient eligibility | Opt-out, blacklist and invalid mobile values are excluded without corrupting subscriptions | pass: focused suite |
| SMS-WF-004 | Email/SMS boundary | SMS campaigns never use email-only recipients or report rows | pass at contract level |
| SMS-WF-005 | Durable/external boundary | SMS delivery, scheduling, retries, provider callbacks and notifications use Temporal when durable; retry, replay, restart and compensation are tested | retry/replay/restart pass for SMS retry state; provider callback/Temporal boundary remains planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| SMS-PERM-001 | SMS Marketing Manager | Campaign/list/contact/configuration mutations succeed | planned browser actor gate |
| SMS-PERM-002 | Marketing User/operator | Permitted reads and subscription actions stay within list/company scope | planned |
| SMS-PERM-003 | Ordinary user | Manager settings and protected campaign transitions return 403 without row changes | pass at contract level |
| SMS-PERM-004 | Wrong company | Campaigns, contacts, lists and reports are not leaked or mutable | planned |
| SMS-PERM-005 | Unauthenticated/expired | Redirect/401/403 without protected response data | planned |
| SMS-PERM-006 | Stale/missing/invalid | 409/404/422 leaves current campaign/list/contact unchanged | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| SMS-UI-001 | Campaign/detail | 1440x900, 390x844 | Menu order, campaign form, recipients, status actions and responsive layout match Odoo | planned paired capture |
| SMS-UI-002 | Lists/contacts | both | List/contact filters, subscription states and forms match Odoo | planned paired capture |
| SMS-UI-003 | Analysis/settings/errors | both | Graph/pivot/list, settings, empty and denied states match Odoo | planned |
| SMS-UI-004 | Current route regression | all manifest-owned SMS routes | Authenticated desktop/mobile checks have no blank/redirect, page/request error or overflow | planned fresh matrix |
| SMS-UI-005 | Blacklisted phone numbers | 1440x900, 390x844 | Configuration menu, list/form, archived filter, empty state, and responsive layout match Odoo | Core3 capture when runtime available; Odoo capture blocked by addon not installed |

## Exit criteria

Full SMS Marketing sign-off requires the focused suite, authenticated campaign
and subscription workflows, all actor/company boundaries, reload/restart
persistence, verified action-permission/workflow parity, and paired Odoo
desktop/mobile comparisons. The focused contract suite alone is not completion.
