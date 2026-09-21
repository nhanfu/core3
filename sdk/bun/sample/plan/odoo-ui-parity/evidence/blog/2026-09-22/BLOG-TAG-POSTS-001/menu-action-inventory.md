# Menu/action inventory

| Odoo entry | Odoo binding | Core3 contract |
| --- | --- | --- |
| Website > Configuration > Blog > Tags | `menu_blog_tag_global`, sequence 30, `action_tags` | `services/blog/manifest.yaml` `/blog-tags`, `pages/tags.yaml`, `api/tags.yaml` |
| Blog Tags list/form | `action_tags`, `blog.tag`, `list,form`, `/blog-tags` | `pages/tags.yaml` visible List/Form tabs and side-panel `tag-detail` |
| Blog Tag form | `blog_tag_form`, `blog.tag` | `pages/tag-detail.yaml`, `api/tag-detail.yaml`, `/blog-tags/detail?id=...` |
| Used in posts | `post_ids` Many2many, label `Used in: ` | `blog_tag_posts` LineItemGrid with add/remove line-item actions |

The existing Blog menu order remains Blogs, Tags, Tag Categories under
Configuration. This slice adds no new menu item.
