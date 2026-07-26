# MovedX reference audit: dashboard, orders, customers, vehicles

Captured 2026-07-26 from the authenticated reference tenant. The captures are
viewport screenshots, not full-page images: they establish the initial visual
state that Core3 must match. Values and notifications are live reference data
and can change; the component and layout contracts below are the durable part
of the audit.

## Evidence files

| Route | 1440 x 1000 desktop | 1024 x 768 tablet |
| --- | --- | --- |
| `#/dashboard` | `dashboard-desktop-1440x1000.png` | `dashboard-tablet-1024x768.png` |
| `#/orders` | `orders-desktop-1440x1000.png` | `orders-tablet-1024x768.png` |
| `#/customers` | `customers-desktop-1440x1000.png` | `customers-tablet-1024x768.png` |
| `#/vehicles` | `vehicles-desktop-1440x1000.png` | `vehicles-tablet-1024x768.png` |

## Shared application frame

- At both audited widths, the fixed left sidebar is 256 px wide, dark navy
  (`rgb(15, 23, 41)`), and the header begins at x=256.
- The top header is 64 px high, translucent white with a light bottom border.
  It contains company identity, locale, attendance/time, chat, notification
  badge, theme switch, and user/avatar menu.
- The header's menu control collapses the sidebar to an icon rail while
  preserving route navigation; attendance and chat controls navigate to their
  shared TMS pages.
- The sidebar has the MovedX mark/tagline, menu search, dashboard, seven
  collapsible module groups, footer version, and an expand/collapse control.
  Expanded groups retain their indented child links and a blue active row.
- Audited resource lists render a declarative breadcrumb and current page title
  above the toolbar (`Quản lý › Đơn hàng`, `Kinh doanh › Khách hàng`, and
  `Quản lý › Phương tiện`).
- The customer list renders the reference company-scope pill and building avatar
  on its primary entity cells.
- Primary list actions share that header row and align to the right; the 1440px
  orders geometry places the action at `y=88` and search at `y=145`.
- The primary action and active navigation color is strong blue (`#2563eb`
  appearance). Surfaces are white, outlined with pale blue-grey borders, use
  8--12 px radii, and rely on subtle shadows rather than heavy fills.
- Main content is offset below the header and uses a 24 px-like gutter. At
  1024 px the sidebar remains present; dense data grids preserve their wide
  columns and clip/scroll inside their card rather than shrinking text.
- Each audited page displayed a dismissible toast at the upper right after
  login. Treat it as an overlay state, not permanent page content.

## Dashboard (`#/dashboard`)

**Composition.** Page title/hello line; a five-button period switcher
(`Tháng này`, `Tháng trước`, `Quý này`, `Năm nay`, `12 tháng`); two compact
date inputs; then five labelled metric regions:

1. `Việc cần làm`: seven clickable status cards (draft orders, approval,
   unassigned trips, in-progress trips, overdue debit notes, expense approval,
   expiring contracts).
2. `Vận hành`: six operational KPI cards.
3. `Doanh thu · Chi phí`: six revenue/profit/order/customer cards.
4. `Công nợ · Dòng tiền`: six receivable/payable/tax/advance cards.
5. `Nhân sự`: six headcount/payroll cards.

The desktop capture shows the wide card grids (seven cards in the first row,
six in later rows) followed by chart cards and two sortable/top-ten data tables.
At 1024 px the grid becomes four columns for the first row and three columns
for the six-card sections; text truncates inside cards instead of overflowing.
Required reusable components: `PeriodSegment`, `DateRange`, `MetricCard`,
`MetricGrid`, `ChartCard`, `SortableTable`, and `Toast`.

## Orders (`#/orders`)

**Navigation and hierarchy.** The `ĐIỀU HÀNH` group expands to the active
`Đơn hàng` link plus nested `Chuyến`, `Điều phương tiện`, `Tin nhắn`,
`Lịch điều`, and `Báo cáo` navigation.

**Page controls.** Breadcrumb `Quản lý > Đơn hàng`; right-aligned `+ Thêm đơn
hàng`; search field (`Tìm mã đơn, khách hàng, tên hàng...`); icon-only advanced
search; `Xuất Excel`; `Cột`; help icon; status tabs with count badges
(`Tất cả`, `Nháp`, `Đang duyệt`, `Đã duyệt`, `Đã hủy`).

**Data grid.** Selection checkbox, sortable `Ngày đơn`, coloured status/type
chips, row number, and fixed bottom pagination (`Hiển thị …`, `Số dòng 50`,
`Trang 1 / n`, first/previous/next/last). Columns are: Mã HT, Khách hàng,
Ngày đơn, Trạng thái, Loại hình, Tuyến, Hình thức, Số chuyến, Tổng tiền,
Người tạo, Ngày giờ tạo. Required reusable components: `PageHeader`,
`ListToolbar`, `TabFilter`, `DataTable`, `StatusChip`, `ColumnPicker`,
`Pagination`, and `IconButton`.

## Customers (`#/customers`)

**Navigation and hierarchy.** `KINH DOANH` expands to `Khách hàng` (active),
`Đối tượng`, `Báo giá`, `Tổng hợp CRM`, `Chỉ tiêu KPI`, and `Báo cáo`.

**Page controls.** Breadcrumb `Kinh doanh > Khách hàng`; scope pill
`Phạm vi xem: Toàn công ty`; right-aligned `+ Thêm khách hàng`; search
(`Tìm mã, tên, MST, SĐT...`); advanced filter, Excel export, column picker,
and help. The four tab filters are `Tất cả`, `Khách tiềm năng`, `Đang tiếp
cận`, and `Khách hàng`, each with a count badge.

**Data grid.** Rows use a blue square building avatar before the bold customer
code/name and smaller legal-name subtitle. Columns: Mã HT, Mã / Tên, Loại,
Mã số thuế, Giai đoạn, Sale phụ trách, Liên hệ chính, Hiển thị, Trạng thái,
Người tạo, Ngày giờ tạo. This is the shared `DataTable` recipe with a
`PrimaryEntityCell`, `ScopePill`, and lifecycle-stage chip variant.

## Vehicles (`#/vehicles`)

**Navigation and hierarchy.** `DANH MỤC` expands to Tài xế, Phương tiện
(active), Container, Địa điểm, Khu vực, Loại container, Loại xe, Đơn vị tính,
Loại hàng hóa, Loại phí, and Tiền tệ.

**Page controls.** Breadcrumb `Quản lý > Phương tiện`; `+ Thêm phương tiện`;
two outlined status filters (`Hoạt động`, `Ngưng hoạt động`); search
(`Tìm theo biển số / số hiệu, tên, hãng...`); advanced filter, Excel export,
column picker, and help. There are no badge tabs before the table.

**Data grid.** Columns: Mã HT, Biển số / số hiệu, Loại phương tiện, Hãng,
Nhà xe, Tải trọng, Trạng thái, Người tạo, Ngày giờ tạo. Rows render an em dash
when a categorical value is absent, weights with `kg`, and a `Sẵn sàng` state
chip. Reuse the list-page components above with `StatusToggleFilter` and
`WeightCell`.

## QA and parity checks for the implementation

- Verify initial desktop and tablet screenshots against these eight files,
  including sidebar width, 64 px header, toolbar alignment, table-card edge,
  active blue states, chip colors, and card wrapping.
- Exercise the dashboard period buttons and date range, every list search,
  filter/tab, add button, column picker, export, row selection, sorting, and
  pagination controls. Capture each meaningful open/active state separately.
- At 1024 px, explicitly confirm no app-frame horizontal overflow; data-table
  overflow must remain inside its table container and must not obscure the
  sidebar, header, pager, or toolbar controls.
