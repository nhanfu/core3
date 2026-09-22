# Verification

- `invoice-detail` page/API IDs match.
- The page declares `attachment_actions` with `Remove` and the API action is a
  permissioned `line_item` delete contract.
- A valid removal changes the seeded attachment from `active = TRUE` to
  `active = FALSE`, increments its row version from 1 to 2, increments the
  invoice row version from 1 to 2, and inserts an invoice message with action
  `accounting.invoices.attachments.remove`.
- The attachment datasource returns no active row after removal, so the
  existing protected download query cannot serve it.
- Actor, parent-version, child-version, relation, and active-state failures
  return 403/409 without changing either row.
- The existing upload/download path remains covered by the same focused suite.
