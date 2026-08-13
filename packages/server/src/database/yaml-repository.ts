import { datasourceMethods } from '../datasource-runtime.ts';
import { DuckDbRepository } from '@core3/server/database/repository';

export class YamlRepository extends DuckDbRepository {}

Object.assign(YamlRepository.prototype, datasourceMethods);
