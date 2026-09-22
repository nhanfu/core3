# Source comparison — `PURCHASE-RFQ-CONFIRM-001`

| Requirement | Core3 result | Status |
| --- | --- | --- |
| List/kanban-bound `Confirm RFQ` action | `confirm_purchase_rfqs` on `purchase-rfqs` | implemented |
| Purchase write permission | Action requires `purchase.write` | implemented |
| Draft/Sent confirmation | Bulk SQL updates eligible RFQs to Confirmed | implemented |
| Mixed selection state handling | To Approve/Cancelled rows are left unchanged | implemented |
| Durable state/version | `purchase_orders` state, approval status, and row version persist | implemented |
| Approval-policy routing to To Approve | Not modeled in this bounded fixture | follow-up |
| Analytic/product validation and mail/chatter side effects | Not modeled by the existing compact RFQ schema | follow-up |
