# Functionality evidence

- deterministic fixture reads as `My Company / 21`;
- missing fixture reads return an empty single-record payload;
- valid updates accept the source range and increment `row_version`;
- zero and 10,001 return `ECOMMERCE_SHOP_PAGE_SIZE_INVALID`;
- foreign-company and stale updates return
  `ECOMMERCE_SHOP_PAGE_SIZE_STALE`;
- Shop projects the effective company page size;
- migration replay is safe and file-backed DuckDB restart preserves the
  selected value and row version.
