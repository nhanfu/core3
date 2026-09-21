# Functionality evidence

- deterministic fixture reads as `My Company / 16px`;
- options expose representative source range values from 0px through 28px;
- missing fixture reads return an empty single-record payload;
- valid updates accept the source range and increment `row_version`;
- invalid values return `ECOMMERCE_SHOP_GRID_GAP_INVALID`;
- foreign-company and stale updates return
  `ECOMMERCE_SHOP_GRID_GAP_STALE`;
- Shop projects the effective company grid gap;
- migration replay is safe and file-backed DuckDB restart preserves the
  selected value and row version.
