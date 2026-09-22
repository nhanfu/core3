# Source comparison

| Odoo 19 source | Core3 contract | Result |
| --- | --- | --- |
| `addons/website_blog/views/blog_post_add.xml:4-16` defines the add form with `blog_id` labeled `Select Blog` and `name` placeholder `Blog Post Title` | `services/blog/api/posts.yaml:41-64` defines `create_blog_post` with only `blog_id` and `name` fields | matched |
| `addons/website_blog/views/blog_post_add.xml:18-24` defines `New Blog Post`, form mode, and `target=new` | `services/blog/pages/posts.yaml:4-9` binds the shared Odoo ListView create entry point to the page/API action | matched through the shared Core3 modal contract; no bespoke page code |
| Odoo ORM creates a `blog.post` draft in the selected blog | `services/blog/api/posts.yaml:49-61` generates the ID, derives `blog_name`/`company_name`, inserts active, and leaves the database Draft default | matched behavior |

Intentional Core3 difference: the Odoo action opens the follow-up website content
editor after the modal; this bounded slice stops at the durable draft creation
and refreshes the Blog Posts list, while the existing Core3 detail editor
remains available through the row action.
