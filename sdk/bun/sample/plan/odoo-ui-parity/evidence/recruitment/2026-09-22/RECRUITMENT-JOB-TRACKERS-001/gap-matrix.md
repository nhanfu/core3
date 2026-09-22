# Gap matrix

| Gap | Change | Evidence |
| --- | --- | --- |
| No job-scoped Trackers action | Added opening detail stat and `/openings/trackers` page/API | source-comparison.md; focused test |
| No durable tracker rows | Added migration `20260922160000-021-recruitment-job-trackers.yaml` with fixed fixtures/index | focused test restart case |
| No CRUD or concurrency boundary | Added writer server-form mutations with row-version guards | focused test CRUD/stale cases |
| No scope/error handling | Added opening/company/actor/duplicate/validation/empty/transport contracts | focused test guard cases |

The separate UTM configuration menus, generated mail aliases, inbound email
creation, and applicant UTM field propagation remain intentionally outside this
stable-ID slice.
