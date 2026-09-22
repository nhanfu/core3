# Verification

The source-backed contract is implemented only in the Time Off service page
and API YAML. The test proves that the selection workflow is durable within a
transaction, rejects invalid aggregate balance, preserves first-approval state
for two-step leave types, and increments each changed request version.

BrowserSkill could not borrow the authenticated `core3_reference` tab because
it was owned by another session. The task-created browser tab reached the
requested database URL but showed Discuss rather than a Time Off action. The
session was stopped after inspection.
