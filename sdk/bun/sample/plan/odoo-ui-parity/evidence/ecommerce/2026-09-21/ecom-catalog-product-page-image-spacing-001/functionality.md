# Functionality evidence

- deterministic fixture reads as `My Company / None`;
- options expose exactly None, Small, Medium, and Big;
- valid update changes the policy and increments `row_version`;
- invalid spacing returns `ECOMMERCE_PRODUCT_PAGE_IMAGE_SPACING_INVALID`;
- foreign-company and stale updates return
  `ECOMMERCE_PRODUCT_PAGE_IMAGE_SPACING_STALE`;
- Product Detail projects the effective company spacing;
- migration replay is safe and file-backed DuckDB restart preserves the
  selected value and row version.

The page/API pair is a permissioned configuration workflow; Product Detail is
read-only and uses the same company-scoped durable policy.
