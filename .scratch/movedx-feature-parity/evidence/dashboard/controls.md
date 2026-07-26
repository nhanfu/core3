# Dashboard Checklist

## Visible controls

- The toolbar exposes the reference dashboard search field and `Xuất CSV` action.
- Global route search, period presets, date range, and CSV export are available.
- KPI cards are grouped into the reference sections `Việc cần làm`, `Vận hành`, `Doanh thu · Chi phí`, `Công nợ · Dòng tiền`, and `Nhân sự`.
- Financial KPI cards use VND formatting and task cards expose draft, approval, dispatch, overdue, and expiring-contract work items.
- Trip status chart, dispatch queue, top routes, and top customers remain below the KPI regions.
- Monthly revenue, cost, and profit are rendered as a multi-series chart alongside trip-status chart data.

## Interaction checks

- Enter a trip, route, vehicle, or driver term and confirm the dispatch queue filters server-side.
- Select each period preset and confirm all KPI and table datasources refresh together.
- Initial dashboard load selects `Tháng này`, fills both date fields, and applies those bounds to every dashboard datasource.
- Enter a custom date range and verify route/customer totals change.
- Export the dispatch queue and confirm the filtered rows are present.
- Use global search to navigate directly to another registered route.

## Responsive check

- Desktop capture: `local-desktop.png` at 1440 x 1000.
- Tablet capture: `local-tablet.png` at 1024 x 768.
- At tablet width, KPI rows wrap into four-column and two-column groups without app-frame overflow.
