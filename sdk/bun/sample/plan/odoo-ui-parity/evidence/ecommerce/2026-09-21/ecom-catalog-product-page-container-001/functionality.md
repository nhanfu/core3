# Functionality evidence

- deterministic fixture reads as `My Company / Unset`;
- options expose exactly Unset, Regular, and Full-width;
- valid update changes the policy and increments `row_version`;
- invalid container returns `ECOMMERCE_PRODUCT_PAGE_CONTAINER_INVALID`;
- foreign-company and stale updates return
  `ECOMMERCE_PRODUCT_PAGE_CONTAINER_STALE`;
- Product Detail projects the effective company container;
- migration replay is safe and file-backed DuckDB restart preserves the
  selected value and row version.

The page/API pair is a permissioned configuration workflow; Product Detail is
read-only and uses the same company-scoped durable policy.
