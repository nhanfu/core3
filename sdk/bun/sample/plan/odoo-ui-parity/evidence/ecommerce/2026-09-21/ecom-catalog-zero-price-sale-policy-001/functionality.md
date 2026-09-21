# Functionality evidence

The deterministic fixture starts `My Company` with zero-price prevention
disabled and `/contactus` as the Contact Us URL.

1. The policy datasource returns the company flag, URL, and computed behavior.
2. `ecommerce.write` updates the flag and URL with optimistic row versions;
   invalid URLs, wrong-company, and stale writes fail without mutation.
3. A deterministic published zero-priced product is exposed as cart-available
   while prevention is disabled.
4. When prevention is enabled, Shop projection marks it unavailable and both
   authenticated and anonymous add-to-cart return
   `ECOMMERCE_SHOP_ZERO_PRICE_UNAVAILABLE`.
5. Disabling prevention restores add-to-cart and preserves the contact URL.
6. Migration replay and DuckDB restart retain the policy and URL.
