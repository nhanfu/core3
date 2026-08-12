import { datasourceMethods } from '../datasource-runtime.ts';
import { DuckDbRepository } from './repository.ts';

export class YamlRepository extends DuckDbRepository {}

Object.assign(YamlRepository.prototype, datasourceMethods);
