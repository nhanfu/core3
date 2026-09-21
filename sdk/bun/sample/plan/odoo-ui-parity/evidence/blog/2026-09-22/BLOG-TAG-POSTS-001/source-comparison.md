# Source comparison

| Odoo 19 source behavior | Core3 implementation | Status |
| --- | --- | --- |
| `blog.tag` form has Name, Category, Color | `services/blog/pages/tag-detail.yaml` OdooFormView fields | implemented |
| Form exposes `Used in: ` and `post_ids` | `LineItemGrid` source `blog_tag_posts`, title `Used in` | implemented |
| `post_ids` is Many2many to `blog.post` | `services/blog/api/tag-detail.yaml` reads/writes existing `blog_post_tags` | implemented |
| `action_tags` has list/form modes | `services/blog/pages/tags.yaml` visible List/Form tabs and side-panel form | implemented |
| Unique tag names | Existing `api/tags.yaml` and detail update guards | implemented |
| Live Blog screen | `core3_reference` lacks `website_blog`; `/blog` 404 | blocked source/runtime comparison |
