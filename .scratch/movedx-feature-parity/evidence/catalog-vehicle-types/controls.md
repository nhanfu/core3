# Vehicle Types Checklist

## Visible controls

- Active/inactive status tabs filter the master-data list.
- Search covers code, name, and description.
- CSV export and CSV import controls are visible.
- Column chooser controls the resource grid.
- Create, edit, and delete actions are permission-gated by `catalog.write`.

## Interaction checks

- Filter `Đang sử dụng` and confirm only active types remain.
- Open the column chooser and hide/show `Ngày tạo`.
- Export the filtered list and verify the selected rows and headers.
- Import a valid CSV and confirm an upserted type appears.
- Reject malformed CSV without changing existing rows.
- Create, edit, and delete a type; verify refresh and audit activity.

## Responsive check

- Desktop capture: `local-desktop.png` at 1440 x 1000.
- Tablet capture: `local-tablet.png` at 1024 x 768.
- At tablet width, the fixed shell remains intact and grid overflow stays inside the content card.
