# Functionality checklist

- [x] Separate page/API YAML contracts joined by `sale-order-detail`.
- [x] Permissioned Discount action and modal field declarations.
- [x] Percentage discount on every accountable line.
- [x] Global percentage discount line.
- [x] Fixed discount line.
- [x] Recomputed line/order totals and row versions.
- [x] Audit activity and file-backed migration/replay coverage.
- [x] Invalid amount/type, stale version, wrong branch, locked status, and
      duplicate global/fixed guards.
- [x] Existing display-lines regression assertion updated to include the new
      sibling action.
- [ ] Authenticated Core3 desktop/mobile visual capture: blocked by absent
      local UI listeners on ports 3001 and 3002.
