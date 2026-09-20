# Functional evidence

- Category list exposes the cover filename and a permissioned action to open
  the category detail page.
- Category detail exposes category identity, company, active state, and cover
  metadata through a separate page/API contract.
- Authenticated users with Ecommerce write permission can upload or replace a
  non-empty `image/*` cover up to 5 MiB, download it, and remove it.
- Wrong-company categories are not readable or writable; invalid MIME/size,
  missing rows, inactive rows, stale row versions, and missing permission are
  explicit error boundaries.
- Upload and removal increment `row_version`; replaying migrations preserves
  the deterministic fixture and reopening DuckDB preserves uploaded metadata
  and exact attachment bytes.
- Category rows with no company remain global, while company-owned rows are
  filtered by the current company in list/detail/attachment reads.
