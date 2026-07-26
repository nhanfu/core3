# Area Registry Checklist

## Visible controls

- Area list supports code/name/region search, active/inactive tabs, column chooser, and CRUD actions.
- Rows expose region, description, translated status, and timestamps; detail navigation is available.

## Interaction checks

- Filter active and inactive areas and verify rows refresh.
- Search by area code, name, or region.
- Open an area detail route and verify the back navigation preserves the registry context.

## Responsive check

- Captures: `local-desktop.png`, `local-tablet.png`.

## Query evidence

- Fresh seeded database: 4 areas returned; `OLD` is translated to `Ngưng hoạt động`.
