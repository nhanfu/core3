import { findDeclaredTransition } from '../../lib/workflow.ts';
import type { EventStore } from '../../lib/server/event-store.ts';
import type { TopicMediator } from '../../lib/topics/mediator.ts';
import { CHAT_THREAD_CREATE } from '../../lib/topics/chat.ts';

/** Action handlers used by the order and chat pages. Domain management actions
 * belong in YAML mutations; this adapter only supplies order-specific guards
 * and the durable chat event bridge. */
export async function handleActionRoutes(ctx: Record<string, any>): Promise<Response | null> {
  const {
    req, pathname, method, repository, WORKFLOWS, authUser, activityActor,
    NAMED_ACTIONS, requirePerm, permissionForAction,
    json, apiError, eventStore, topics,
  } = ctx;

  const match = pathname.match(/^\/api\/actions\/([A-Za-z0-9_.-]+)$/);
  if (!match || method !== 'POST') return null;

  const actionName = match[1];
  const actionDefinition = NAMED_ACTIONS[actionName];
  if (!actionDefinition) return apiError(404, `Unknown action: ${actionName}`);
  requirePerm(permissionForAction(actionName));

  const body = await req.json() as any;
  const handler = actionDefinition.handler;
  if (handler === 'chat' && actionDefinition.operation === 'create_thread') {
    return json(await (topics as TopicMediator).request(CHAT_THREAD_CREATE, { values: valuesFrom(body), actor: activityActor }));
  }
  const workflow = handler === 'order_transition'
    ? WORKFLOWS.get(String(actionDefinition.workflow || ''))
    : undefined;
  const transition = workflow
    ? findDeclaredTransition(workflow.transitions || [], String(actionDefinition.operation || ''))
    : undefined;
  const mutation = actionDefinition.mutation || (transition?.mutation
    ? { ...transition.mutation, ...(transition.scope ? { scope: { ...workflow?.scope, ...transition.scope } } : {}) }
    : undefined);

  if (mutation) {
    if (handler === 'order_transition' && transition?.permission) requirePerm(transition.permission);
    const values = body?.values && typeof body.values === 'object' ? body.values : {};
    const scalarBody = Object.fromEntries(Object.entries(body || {}).filter(([, value]) =>
      value === null || ['boolean', 'number', 'string'].includes(typeof value)));
    const event = {
      operation: String(actionDefinition.operation || 'changed'),
      actorId: String(authUser.sub || ''),
      clientMessageId: typeof body?.client_message_id === 'string' ? body.client_message_id : undefined,
      threadId: typeof body?.id === 'string' ? body.id : undefined,
    };
    try {
      const result = await repository.executeMutation(mutation, {
        ...scalarBody,
        values,
        id: typeof body?.id === 'string' ? body.id : undefined,
        thread_id: typeof body?.id === 'string' ? body.id : '',
        current_user_id: String(authUser.sub || ''),
        current_user_name: activityActor.name,
        current_branch_id: String(authUser.branch_id || ''),
        view_scope: String(authUser.view_scope || 'all'),
      });
      if (handler === 'chat') await (eventStore as EventStore).publish({
        ...event,
        status: 'success',
        messageId: typeof result?.id === 'string' ? result.id : undefined,
        message: actionDefinition.operation === 'send_message' ? {
          id: result?.id,
          thread_id: result?.thread_id,
          sender_id: result?.sender_id,
          sender_name: activityActor.name,
          body: result?.body,
          created_at: new Date().toISOString(),
        } : undefined,
      });
      return json(result);
    } catch (error) {
      if (handler === 'chat') await (eventStore as EventStore).publish({
        ...event, status: 'failed', error: String((error as any)?.message || 'Message failed'),
      });
      throw error;
    }
  }

  return apiError(404, `Unsupported action handler: ${handler}`);
}

function valuesFrom(body: any): Record<string, unknown> {
  return body?.values && typeof body.values === 'object' ? body.values : {};
}
