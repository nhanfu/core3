# Functionality checklist

| Case | Expected | Result |
| --- | --- | --- |
| SMS-DELIVERY-RETRY-001 | Trace list and form use separate page/API YAML joined by matching `page.id` | pass |
| SMS-DELIVERY-RETRY-002 | Search, campaign/status filters, empty state, and company scope are explicit | pass |
| SMS-DELIVERY-RETRY-003 | Sent mailing with failed attempts returns to `In Queue`; failed attempts become pending and increment attempt number | pass |
| SMS-DELIVERY-RETRY-004 | Wrong company, non-sent/no-failure, and stale row-version retry are rejected without mutation | pass |
| SMS-DELIVERY-RETRY-005 | Migration replay and file-backed restart retain retry state | pass |
| SMS-DELIVERY-RETRY-006 | Authenticated Odoo desktop/mobile trace comparison | blocked: addon not installed |
