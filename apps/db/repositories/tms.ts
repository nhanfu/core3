import { DuckDbRepositoryCore } from './tms-core.ts';
import { masterMethods } from './tms-master.ts';
import { dataMethods } from './tms-data.ts';
import { activityChatMethods } from './tms-activity-chat.ts';
import { crmMethods } from './tms-crm.ts';
import { workflowsMethods } from './tms-workflows.ts';
import { documentLinesMethods } from './tms-document-lines.ts';
import { usersMethods } from './tms-users.ts';

type TmsRepository = DuckDbRepositoryCore & typeof masterMethods & typeof dataMethods & typeof activityChatMethods & typeof crmMethods & typeof workflowsMethods & typeof documentLinesMethods & typeof usersMethods;

const Repository = class extends DuckDbRepositoryCore {};
Object.assign(Repository.prototype, masterMethods, dataMethods, activityChatMethods, crmMethods, workflowsMethods, documentLinesMethods, usersMethods);

export const DuckDbRepository = Repository as unknown as {
  new (db: any): TmsRepository;
};
