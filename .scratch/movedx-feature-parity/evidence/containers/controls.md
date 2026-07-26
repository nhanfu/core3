# Container Registry Checklist

## Visible controls

- Container list supports number/type/owner search, availability tabs, CSV export, column chooser, and CRUD actions.
- Rows expose container type, owner, location code/name, translated status, and timestamps.

## Interaction checks

- Filter ready, in-use, maintenance, and inactive containers.
- Search by container number or owner and verify matching rows remain.
- Edit a container status/location and confirm the list refreshes.

## Responsive check

- Captures: `local-desktop.png`, `local-tablet.png`.

## Query evidence

- Fresh seeded database: 5 containers returned; `CMAU4567890` resolves location `KHOHN` / `Kho hàng không Nội Bài` with status `Sẵn sàng`.
