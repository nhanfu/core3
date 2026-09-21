# Functionality evidence

- deterministic fixture reads as `My Company / 3`;
- options expose exactly 2, 3, 4, and 5 columns;
- missing fixture reads return an empty single-record payload;
- valid update changes the policy and increments `row_version`;
- invalid values return `ECOMMERCE_SHOP_GRID_COLUMNS_INVALID`;
- foreign-company and stale updates return
  `ECOMMERCE_SHOP_GRID_COLUMNS_STALE`;
- Shop projects the effective company grid-column setting;
- migration replay is safe and file-backed DuckDB restart preserves the
  selected value and row version.
