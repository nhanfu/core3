# Location Registry Checklist

## Visible controls

- Location list supports code/name/city/address search, active/inactive tabs, CSV export, column chooser, and CRUD actions.
- Rows expose translated location type, address/city, area code/name, status, and timestamps.

## Interaction checks

- Filter active and inactive locations and verify rows refresh.
- Search by code, name, city, or address.
- Edit an area mapping or status and confirm the list refreshes.

## Responsive check

- Captures: `local-desktop.png`, `local-tablet.png`.

## Query evidence

- Fresh seeded database: 5 locations returned; `CATLAI` maps to area `MN` / `Miền Nam` and translates to `Cảng` / `Hoạt động`.
