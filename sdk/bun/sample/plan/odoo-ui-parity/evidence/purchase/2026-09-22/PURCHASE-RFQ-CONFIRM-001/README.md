# Purchase Confirm RFQ — `PURCHASE-RFQ-CONFIRM-001`

Bounded feature: Odoo Purchase `Confirm RFQ` list/kanban bulk action.

Core3 keeps the page/API split on `page.id: purchase-rfqs` and adds the
`confirm_purchase_rfqs` bulk action. Draft and Sent RFQs transition to
Confirmed, increment `row_version`, and set `approval_status: approved`.
Odoo's non-confirmable states remain unchanged when included in a mixed
selection.

Evidence files:

- [odoo-analysis.md](odoo-analysis.md)
- [source-comparison.md](source-comparison.md)
- [functionality-checklist.md](functionality-checklist.md)
- [test-results.md](test-results.md)
- [verification.md](verification.md)
- [gap-matrix.md](gap-matrix.md)

No screenshots or credentials are committed.
