# Gap matrix

| Gap | Required change | Evidence/result |
| --- | --- | --- |
| Preview had no Pay Now action | Add page/API-matched navigation to an invoice payment form | focused contract test pass |
| Payment transaction had no invoice relation | Add idempotent migration column/index and link new pending rows | persistence test pass |
| Repeated payment request could create duplicates | Guard active draft/pending/authorized transaction per invoice | duplicate guard pass |
| Payment must not settle before provider completion | Keep invoice residual/state unchanged and record pending state only | mutation assertion pass |
| Shared authenticated Odoo tab was unavailable | Preserve no-credential/no-takeover boundary and record exact BrowserSkill blocker | `browser-check.md`; no visual claim |
| Provider completion, public share, and access tokens absent | Follow-up payment-provider/portal integration | not claimed complete |
