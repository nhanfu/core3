# Verification and blockers

The authenticated live Odoo reference was inspected before implementation and
the exact Duplicate menu/result was observed. Core3 authentication and the
contact detail page were also observed in bsk session `xhpr`, including the
Actions menu and Duplicate item.

The final browser attempt used browser instance `245ea108`. A fresh bsk session
`pwew` was created with a 1440x900 agent window and then failed navigation with
`session not registered or already stopped`. The prior Core3 sessions were also
no longer present in `bsk session list`. This is an infrastructure/session
blocker, not a product test result. No desktop/mobile screenshot or visual
parity claim is made for the duplicate transition.

The contract and restart tests are the authoritative functional evidence for
this bounded slice. The bsk session was stopped/absent at handoff; no bsk
session is intentionally left open.
