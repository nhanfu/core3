# Test results

- Focused: `bun test --timeout 30000 ./test/ecommerce_shop_product_ratings.integration.test.ts`
  — **2 passed, 35 assertions, 0 failures**.
- Expanded Shop/reviews regression:
  `bun test --timeout 30000 ./test/ecommerce_shop_product_ratings.integration.test.ts
  ./test/ecommerce_shop_product_action_style.integration.test.ts
  ./test/ecommerce_shop_product_action_placement.integration.test.ts
  ./test/ecommerce_shop_product_cta.integration.test.ts
  ./test/ecommerce_shop_product_descriptions.integration.test.ts
  ./test/ecommerce_shop.integration.test.ts
  ./test/ecommerce_shop_grid_gap.integration.test.ts
  ./test/ecommerce_shop_page_size.integration.test.ts
  ./test/ecommerce_shop_grid_columns.integration.test.ts
  ./test/ecommerce_product_reviews.integration.test.ts` — **22 passed,
  307 assertions, 0 failures**.
- Scoped ESLint passed for the focused integration test.
- `bun run audit` is blocked before Ecommerce discovery by the unrelated
  `services/livechat/pages/channel-detail.yaml` action with empty `fields`.
- Scoped `git diff --check` is run over the owned Ecommerce and parity paths
  before commit.
