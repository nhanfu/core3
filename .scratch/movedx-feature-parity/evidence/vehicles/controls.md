# Vehicle Directory Checklist

## Visible controls

- The page header renders `Quản lý › Phương tiện` above the list controls.
- The primary add action shares the page-header row and is right aligned.
- The grid renders a server-page-aware row-number column after selection.

- Vehicle list supports search, availability tabs, CSV export, column chooser, and CRUD actions.
- Rows expose plate/model, vehicle type, branch, capacity, translated availability, creator, and timestamp.
- Vehicle detail shows status, service dates, mileage, assigned driver/license, maintenance history, and trip history.

## Interaction checks

- [x] Shared filter and help icon controls render beside export and remain keyboard accessible.

- Filter ready, maintenance, and out-of-service vehicles and verify rows refresh.
- Search by plate or model and confirm matching vehicles remain.
- Open `truck-02` and verify the assigned driver, maintenance entry, and trip history.
- Toggle list and detail table column choosers without losing the active route.
- Edit capacity/status and confirm the list/detail relationship refreshes.
- Pagination defaults to 50 rows and offers server-backed 10/25/50/100 page-size choices.

## Responsive check

- List captures: `list-desktop.png`, `list-tablet.png`.
- Detail captures: `detail-desktop.png`, `detail-tablet.png`.

## Query evidence

- Fresh seeded database: 12 vehicle rows returned by `vehicles`.
- `vehicle_detail(truck-02)`: `CA-102-DEF`, `Kenworth T680`, branch `Ho Chi Minh City Branch`, driver `Tran Thi Bich`, status `Bảo dưỡng`.
- `vehicle_maintenance(truck-02)`: one completed oil-change record.
- `vehicle_trips(truck-02)`: one completed trip (`TRP-013`).
