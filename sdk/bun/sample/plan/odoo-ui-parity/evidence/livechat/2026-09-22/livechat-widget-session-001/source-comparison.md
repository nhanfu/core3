# Live Chat public widget session — source comparison

## Odoo 19 source

- `addons/im_livechat/controllers/main.py` declares public POST JSON-RPC `/im_livechat/get_session` with `channel_id`, optional previous operator and chatbot ids, and `persisted=True`.
- Odoo resolves the channel with `sudo()`, selects an available operator or chatbot, creates a persisted `discuss.channel` for the durable branch, and returns `store_data` plus `channel_id`.
- `addons/im_livechat/controllers/cors/main.py` exposes `/im_livechat/cors/get_session` and forwards the same parameters.

## Live reference

The authenticated `core3_reference` instance does not expose the installed Live Chat addon: `/im_livechat/support/1` returned Odoo Error 404 at the observed desktop and mobile viewport sizes. This prevents live session creation/resume verification; the blocker is recorded rather than treated as feature evidence.

## Core3 bounded contract

- `services/livechat/api/widget-session.yaml` retains the exact Odoo route on the public action and exposes token-scoped session/messages datasources.
- `services/livechat/pages/widget-session.yaml` is layout-only and joins the API fragment through `page.id: livechat-widget-session`.
- `20260922100000-052-livechat-widget-session.yaml` durably stores the widget session and seeds an idempotent operator-backed demo.

Intentional bounded differences are a Core3 visitor token in place of Odoo's `mail.guest` cookie context, a normalized operator/session projection instead of Odoo's `store_data` graph, and durable-only handling of `persisted=False`. The action rejects closed-session replay so callers must establish a new visitor token for a new conversation.
