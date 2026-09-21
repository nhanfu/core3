# Functionality checklist

| Case | Expected | Result |
| --- | --- | --- |
| Detail count | Matching email/phone/customer records produce `duplicate_lead_count` | pass |
| Email match | Similar Leads lists the stable Globex match with `match_reason: Email` | pass |
| Phone/customer match | Query contract supports normalized phone and shared customer matching | pass by source/query contract |
| Empty state | `fixture_state=empty` returns no rows | pass |
| No-results state | `fixture_state=no_results` returns no rows | pass |
| Forbidden state | `fixture_state=forbidden` returns 403 without rows | pass |
| Transport state | `fixture_state=transport_error` returns 503 | pass |
| Row navigation | A duplicate row navigates to `/lead-detail` under `crm.read` | pass by API contract |
| Migration replay | Reapplying the CRM migration does not duplicate index/schema state | pass |
| Restart | Closing/reopening the file-backed CRM database preserves the match | pass |
| Desktop/mobile UI | Authenticated paired rendering | blocked; reference CRM absent and Core3 runtime discovery failed |
