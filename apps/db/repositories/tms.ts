import { DuckDbRepositoryCore } from './tms-core.ts';
import { dataMethods } from './tms-data.ts';
import { activityChatMethods } from './tms-activity-chat.ts';
import { documentLinesMethods } from './tms-document-lines.ts';
import { usersMethods } from './tms-users.ts';

type TmsRepository = DuckDbRepositoryCore & typeof dataMethods & typeof activityChatMethods & typeof documentLinesMethods & typeof usersMethods;

const Repository = class extends DuckDbRepositoryCore {};
Object.assign(Repository.prototype, dataMethods, activityChatMethods, documentLinesMethods, usersMethods);

export const DuckDbRepository = Repository as unknown as {
  new (db: any): TmsRepository;
};
