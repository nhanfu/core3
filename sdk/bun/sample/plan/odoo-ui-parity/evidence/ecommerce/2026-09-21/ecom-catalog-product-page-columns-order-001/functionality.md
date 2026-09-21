# Functionality evidence

- deterministic fixture reads as `My Company / Regular order`;
- options expose exactly Regular order and Inverse order;
- valid update changes the policy and increments `row_version`;
- invalid order returns `ECOMMERCE_PRODUCT_PAGE_COLUMNS_ORDER_INVALID`;
- foreign-company and stale updates return
  `ECOMMERCE_PRODUCT_PAGE_COLUMNS_ORDER_STALE`;
- Product Detail projects the effective company columns order;
- migration replay is safe and file-backed DuckDB restart preserves the
  selected value and row version.

The page/API pair is a permissioned configuration workflow; Product Detail is
read-only and uses the same company-scoped durable policy.
