# Functionality evidence

- deterministic fixture reads as `My Company / Regular`;
- options expose exactly Regular and Full-width;
- valid update changes the policy and increments `row_version`;
- invalid container returns `ECOMMERCE_SHOP_PAGE_CONTAINER_INVALID`;
- foreign-company and stale updates return
  `ECOMMERCE_SHOP_PAGE_CONTAINER_STALE`;
- Shop products project the effective company container;
- migration replay is safe and file-backed DuckDB restart preserves the
  selected value and row version.

The page/API pair is a permissioned configuration workflow; Shop is read-only
and uses the same company-scoped durable policy.
