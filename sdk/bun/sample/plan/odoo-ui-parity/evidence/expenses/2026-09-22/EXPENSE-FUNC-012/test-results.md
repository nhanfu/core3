# Test results

- `bun test test/expenses_category_cost.integration.test.ts` - 4 tests / 18
  assertions, pass.
- Combined focused regression of category cost, category CRUD, and migration
  replay tests - 8 tests / 61 assertions, pass.
- Migration replay verifies 14 applied Expenses migrations and unchanged seeded
  sheet, expense, activity, attachment, duplicate, and split-line counts.
