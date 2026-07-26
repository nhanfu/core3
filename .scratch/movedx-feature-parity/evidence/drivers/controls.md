# Driver Directory Checklist

## Visible controls

- Driver list supports search, availability tabs, CSV export, column chooser, and CRUD actions.
- Compliance is derived from license expiry and shown separately from availability.
- Driver detail shows license/contact context and assigned trip history.

## Interaction checks

- Filter active, leave, and inactive drivers and verify rows refresh.
- Search by license number and confirm matching drivers remain.
- Verify expired, expiring, and valid compliance chips against seeded expiry dates.
- Open `driver-01` and verify assigned trip history and vehicle context.
- Edit assigned vehicle and confirm the list/detail relationship refreshes.

## Responsive check

- List captures: `list-desktop.png`, `list-tablet.png`.
- Detail captures: `detail-desktop.png`, `detail-tablet.png`.
