// TMS application wiring. The host imports this module contract instead of
// reaching into individual business services.
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { discoverPages } from '../../lib/server/discovery.ts';
import { createTmsApi } from './api.ts';
import { DuckDbRepository as TmsRepository } from '../../db/repositories/tms.ts';
import type { EventBus } from '../../lib/server/event-store.ts';
import { TopicMediator } from '../../lib/topics/mediator.ts';
import { MediatorAuthAdapter } from '../../lib/topics/auth-adapter.ts';
import { CHAT_ATTACHMENT_SEND, CHAT_THREAD_CREATE } from '../../lib/topics/chat.ts';

export { DuckDbRepository } from '../../db/repositories/tms.ts';
export class TmsModule {
  readonly id = 'tms';
  private db: any = null;
  private repository: any = null;
  private eventStore: EventBus | null = null;
  private topics: TopicMediator | null = null;

  install(context: { moduleRoot: string }): void {
    mkdirSync(join(context.moduleRoot, '.data'), { recursive: true });
  }

  async load(context: {
    appsRoot: string;
    moduleRoot: string;
    env: NodeJS.ProcessEnv;
    serviceConfigs: Record<string, any>;
    eventBus: EventBus;
    registerApi(handler: (request: Request, url: URL) => Response | null | Promise<Response | null>): void;
    resolveService<T>(name: string): T;
  }): Promise<void> {
    const uploadRoot = context.env.TMS_UPLOAD_ROOT || join(context.moduleRoot, '.data', 'uploads');
    this.db = context.resolveService<any>('database');
    this.repository = new TmsRepository(this.db);
    this.eventStore = context.eventBus;
    const discovered = discoverPages(context.appsRoot);
    const chatPage = discovered.pages.get('chat')?.config as any;
    const chatActions = new Map((chatPage?.actions || []).map((action: any) => [String(action.id), action]));
    this.topics = new TopicMediator(context.eventBus, `tms-${process.pid}`);
    this.topics.register({
      definition: CHAT_THREAD_CREATE,
      handle: ({ values, actor }) => this.repository.executeMutation(chatActions.get('create_thread')?.mutation, {
        ...values,
        current_user_id: actor.id || null,
        current_user_name: actor.name,
        view_scope: 'all',
      }),
    });
    this.topics.register({
      definition: CHAT_ATTACHMENT_SEND,
      handle: ({ threadId, content, attachment, actor }) => this.repository.executeMutation(chatActions.get('upload_attachment')?.mutation, {
        thread_id: threadId,
        content,
        ...attachment,
        current_user_id: actor.id || null,
        current_user_name: actor.name,
        view_scope: 'all',
      }),
    });
    this.topics.start();

    const authProvider: any = new MediatorAuthAdapter(this.topics);
    const pageMaps = {
      pages: new Map([...discovered.pages].map(([id, page]) => [id, page.config])),
      datasources: new Map(discovered.datasources),
      catalogs: new Map(discovered.catalogs),
      menus: new Map(discovered.menus),
      workflows: new Map([...discovered.workflows].map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].map(([id, workflow]) => [id, workflow.file])),
    };
    const reloadPages = () => {
      const next = discoverPages(context.appsRoot);
      const replacements = {
        pages: new Map([...next.pages].map(([id, page]) => [id, page.config])),
        datasources: next.datasources,
        catalogs: next.catalogs,
        menus: next.menus,
        workflows: new Map([...next.workflows].map(([id, workflow]) => [id, workflow.config])),
        workflowFiles: new Map([...next.workflows].map(([id, workflow]) => [id, workflow.file])),
      };
      for (const key of Object.keys(pageMaps) as Array<keyof typeof pageMaps>) {
        const target = pageMaps[key];
        target.clear();
        for (const [entryKey, entryValue] of replacements[key]) target.set(entryKey, entryValue);
      }
    };
    context.registerApi(createTmsApi({
      repository: this.repository,
      authProvider,
      sources: pageMaps.datasources,
      pages: pageMaps.pages,
      catalogs: pageMaps.catalogs,
      menus: pageMaps.menus,
      workflows: pageMaps.workflows,
      workflowFiles: pageMaps.workflowFiles,
      permissions: discovered.permissions.get('tms')?.config || {},
      uploadRoot,
      eventStore: this.eventStore,
      topics: this.topics,
      reloadPages,
    }));
  }

  async unload(): Promise<void> {
    this.topics?.stop();
    this.topics = null;
    this.eventStore = null;
    this.db = null;
    this.repository = null;
  }

  async uninstall(): Promise<void> {}
}

export default TmsModule;
