# Gap matrix

| Gap | Change | Dependency | Evidence |
| --- | --- | --- | --- |
| Tags action had no visible Form mode/detail relation panel | Add List/Form tabs, side-panel page, and Odoo form layout | shared ListView/OdooFormView | focused test; browser blocker capture |
| Reverse `post_ids` was absent | Add `blog_tag_posts` datasource and `blog_tag_post_lookup` | existing `blog_post_tags` schema | focused test |
| Tag-side mutations were absent | Add guarded line-item add/remove actions | blog.read/blog.write permissions | focused test |
| Legacy `blog_posts.tags` could drift | Synchronize projection in both mutation paths | existing normalized relation | focused restart test |
| Authenticated visual parity unavailable | Capture exact Odoo 404 desktop/mobile state and record Core3 probe | live/reference runtime | browser-check.md |
