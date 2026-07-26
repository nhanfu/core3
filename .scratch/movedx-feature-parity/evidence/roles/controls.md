# Roles Route Checklist

## Visible controls

- Role summary shows the role identifier, description, permission count, and assigned-user count.
- Role summary and list expose the server-owned view scope (`all`, `branch`, or `own`).
- Permission matrix lists the server catalog and current grant state.
- `Cập nhật phạm vi xem` opens a prefilled detail editor and persists only validated scope values.
- Grant and revoke controls appear only for users with `settings.write`.
- Assigned-user grid shows user, branch, department, and enabled state.
- Assigned-user grid supports column visibility changes and responsive scrolling.

## Interaction checks

- Grant `accounting.pay` to a role and confirm it appears as granted.
- Revoke the same permission and confirm it returns to `Chưa cấp`.
- Confirm each mutation creates a role activity event.
- Open the role as a read-only user and confirm grant/revoke controls are absent and server calls are denied.
- Use the column chooser on assigned users and confirm the grid updates.

## Responsive check

- Desktop capture: `local-detail-desktop.png` at 1440 x 1000.
- Tablet capture: `local-detail-tablet.png` at 1024 x 768.
