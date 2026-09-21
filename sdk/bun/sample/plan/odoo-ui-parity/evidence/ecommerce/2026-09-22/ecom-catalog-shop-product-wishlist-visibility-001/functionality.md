# Functionality evidence

- Default policy: My Company starts with `show_wishlist = true`, matching the
  supplied Odoo Website Sale default class list.
- Update path: `ecommerce.shop.product_wishlist.update` requires
  `ecommerce.write`, validates a boolean, checks company scope and expected
  row version, increments the row version, and refreshes the policy and Shop
  product sources.
- Projection: Shop policy and each Shop product expose the effective
  `show_wishlist` value; setting it false hides the card affordance state
  without changing wishlist rows or public wishlist operations.
- Recovery: repeated schema/data migration replay is idempotent and a DuckDB
  close/reopen retains the updated policy and row version.
