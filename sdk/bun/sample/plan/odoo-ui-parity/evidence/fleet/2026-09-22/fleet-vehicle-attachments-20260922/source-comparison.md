# Source comparison

| Odoo contract | Core3 contract | Result |
| --- | --- | --- |
| `fleet.vehicle` inherits `mail.thread` | Vehicle detail declares an Odoo attachment panel beside its existing form/chatter seam | Supported in bounded slice |
| Vehicle form includes native chatter | `fleet_vehicle_attachments` datasource is bound to `vehicle-detail` | Supported |
| Attachment metadata is durable and downloadable | Fleet-owned table plus `storage.yaml` download rule | Supported |
| Upload/remove follows Fleet vehicle security and company scope | `fleet.write`, actor, company, active vehicle, and row-version guards | Supported |
| Rich Odoo followers/message composer/attachment binary semantics | Existing shared chatter and local metadata storage are reused | Partial; outside this attachment-only slice |
| Live Fleet desktop/mobile visual comparison | Fleet not installed/exposed in requested reference DB | Blocked, not claimed |
