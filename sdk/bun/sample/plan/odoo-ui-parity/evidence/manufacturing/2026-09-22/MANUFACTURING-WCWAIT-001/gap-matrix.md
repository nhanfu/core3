# Gap matrix

| Gap | Required behavior | Core3 owner | Verification |
| --- | --- | --- | --- |
| Missing dedicated route | Selected Work Center Waiting Availability must be addressable and discoverable | `pages/work-center-waiting.yaml`, `api/work-center-waiting.yaml` | Discovery test |
| Incorrect global fallback | Dashboard navigation must preserve durable work-center scope | `api/work-center-overview.yaml` | Navigation assertion and scoped query test |
| Missing fixed Waiting state | The action must not show Ready/Progress rows | `api/work-center-waiting.yaml` query | Assembly 1/2 and Ready filter assertions |
| Missing visible dashboard control | Users must find Waiting Availability from Work Centers | `pages/work-center-overview.yaml` row action | Page contract assertion |
| Workflow reuse | Waiting rows must plan through existing guarded workflow | `api/work-center-waiting.yaml` | Permission/action metadata assertions |
| Browser source proof | Odoo and Core3 paired captures | Browser instance/runtime | Core3 pass; Odoo blocked and captured |
