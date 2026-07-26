# Users Route Checklist

## Visible controls

- Seat usage cards show total, active, and disabled accounts.
- Search covers user name, email, branch, and department.
- Status tabs filter all, active, and disabled accounts.
- CSV export and column chooser are available on the resource list.
- Users with `settings.write` can invite and edit accounts.
- Each row opens the user detail route and exposes role assignment there.

## Interaction checks

- Search for `Disabled` and select `Đã khóa`; only disabled accounts remain.
- Toggle a visible column through the chooser and confirm the grid updates.
- Export the filtered list and confirm the CSV contains the displayed fields.
- Invite a user with branch, department, and disabled state; totals and list refresh.
- Edit an account password through the server-backed form; old login fails and the new login succeeds.
- Open a user detail route and verify state, branch, department, last login, roles, permissions, and activity.

## Responsive check

- Desktop capture: `local-desktop.png` at 1440 x 1000.
- Tablet capture: `local-tablet.png` at 1024 x 768.
- At tablet width, the sidebar remains visible and the data grid stays within the content scroll area.
