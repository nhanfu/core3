# Website Page Manager old-URL redirect — WEBSITE-PAGE-REDIRECT-001

This bounded slice implements the Odoo Page Properties `Redirect Old URL`
action for Page Manager edits. Core3 stores redirects in
`website_page_redirects` and creates them transactionally when a page URL
changes and the editor enables the redirect option.

No Odoo frontend code is copied. The page/API contracts remain separate and
join by `page.id`.
