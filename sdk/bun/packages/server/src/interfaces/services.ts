import type { IAuthProvider } from '../../../../apps/services/auth/interfaces.ts';
import type { IRepository } from '@core3/client/interfaces/datasource';

/** Host application services consumed by the framework server runtime. */
export interface FrameworkServices {
  repository: IRepository;
  auth: IAuthProvider;
}

/** Explicit registration surface used by a host application's composition root. */
export interface IServiceRegistry {
  register(key: keyof FrameworkServices, implementation: FrameworkServices[keyof FrameworkServices]): this;
  resolve<K extends keyof FrameworkServices>(key: K): FrameworkServices[K];
}
