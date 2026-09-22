# Source comparison and gap matrix

| Source behavior | Existing Core3 before this feature | Bounded change |
|---|---|---|
| Settings action exposes editable binary `favicon` image field | `pages/settings.yaml` rendered an informational text saying favicon upload was separate | Add declarative image field with shared SettingsView upload control |
| Website-scoped durable favicon storage | `website_websites` had no favicon columns | Add filename, MIME, size, storage key, and base64 bytes through migration 018 |
| Manager-only settings write | Name/domain save required `website.manage`; favicon had no action | Add `upload_website_favicon` with `website.manage`, missing-site and row-version guards |
| Favicon bytes can be retrieved | No Website favicon download contract | Add `website_favicon` storage route and data-URL preview in the settings datasource |
| Invalid/stale upload behavior | No favicon validation or concurrency path | Reject non-image/over-1MB input with 422 and stale row versions with 409; failed uploads clean up local files |

The feature remains joined by `page.id: website-settings`; presentation remains
in `pages/settings.yaml`, while datasource/action/storage behavior remains in
the API and storage contracts.
