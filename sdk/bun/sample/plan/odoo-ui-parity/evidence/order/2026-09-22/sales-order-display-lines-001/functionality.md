# Sales order display lines — functionality evidence

- `Add a section` persists `display_type = line_section` and `Add a note`
  persists `display_type = line_note` with zero quantity, price, tax, and line
  total.
- Display rows do not change the order monetary total. Create, edit, and
  delete each increment the parent row version and add a Sales timeline entry.
- Create/edit/delete require `orders.write`, current branch scope, Draft or
  Pending Approval state, current parent/line row versions, and a trimmed
  description from 1 to 500 characters.
- A product row cannot be edited or deleted through the display-line actions;
  the API guard accepts only `line_section` and `line_note`.
- Focused command:

  `bun test test/sales_order_display_lines.integration.test.ts --timeout 30000`

  Result: 4 tests passed, 24 assertions, 0 failures.
- The same test runs the complete Order migration set twice and reopens a
  file-backed DuckDB after creating a note; the display row and migration
  version remain present.
