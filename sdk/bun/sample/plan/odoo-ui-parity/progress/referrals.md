# referrals parity progress

Module owner: referrals module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: source-limited CRUD/workflow/browser slice verified
Verification trigger: feature-complete after `hr_referral` is installed in the live reference
Candidate commit: a071e43250f8334b0bb215b7e2e6eab3860f11a5

## Current state

This module is registered in odoo-parity-plan.md but the live Odoo reference
does not install `hr_referral`; no exact menu/action/view parity claim is made.
The current provisional slice separates page contracts from service-owned API
fragments and has now passed live authenticated Core3 create/edit/delete,
workflow, actor-permission, and desktop/mobile route checks. Evidence is under
`/tmp/core3-odoo-parity/referrals-20260920-rerun/`. The previous aborted
`/api/auth/me` observation was isolated to the browser harness; fresh
independent contexts returned 200 with no failed requests. No Odoo visual
parity claim is made because `hr_referral` is absent from the live reference.

## Next bounded task

Complete the source-limited API/page slice review, then obtain/install the
matching Odoo addon and record the exact menu/action/view inventory before
claiming parity. Update this file only with evidence from the matching module
owner.
