# Gap matrix

| Gap | Impact | Decision |
| --- | --- | --- |
| Core3 does not calculate Odoo's sequence-aware inalterable hash chain | Cannot claim cryptographic immutability or sequence-gap validation | Keep outside smallest slice; retain durable lock audit state |
| Core3 uses service `lock_enabled` instead of Odoo journal configuration | Lock availability is configured at the service document boundary | Explicitly expose `hash_lock_enabled` and document the approximation |
| Odoo hashes a journal chain; Core3 locks one document | Related entries are not automatically secured | Defer bulk/chain workflow to a separate stable feature |
| Core3 browser runner cannot start | No authenticated Core3 desktop/mobile evidence | Hold visual sign-off; do not claim parity |
