# Gap matrix

| Stable ID | Gap / acceptance | Implementation | Evidence |
| --- | --- | --- | --- |
| AB-AUTO-WINNER-001 | Missing automatic winner action | `api/mailing-detail.yaml` action `send_ab_winner_email_mailing` | Focused contract test |
| AB-AUTO-WINNER-002 | Missing metric-based variant selection | Ratio `CASE` ordering with stable ID tie-break | Durable winner test |
| AB-AUTO-WINNER-003 | Missing final queued 100% copy | Deterministic `email-mailing-ab-winner-*` insert | Durable winner test |
| AB-AUTO-WINNER-004 | Missing completion/idempotence boundary | Sibling completion, existing-winner guard, row versions | Guard test |
| AB-AUTO-WINNER-005 | Missing page/API ownership and permission | `page.id: mailing-detail`, `email_marketing.write` | Contract test |
| AB-AUTO-WINNER-006 | Missing authenticated desktop/mobile evidence | BrowserSkill tab owned by session `fngy` | Browser check and verification |
