export const SERVICE_KEYS: any;
export const createFramework: any;
export const renderPage: any;
export const registerNavigator: any;
export const navigate: any;
export const getPageParams: any;
export const client: any;
export const html: any;

export class BaseComponent {
  [key: string]: any;
  constructor(id: string, initialState?: any);
  id: string;
  state: any;
  parent: any;
  children: any[];
  _container: HTMLElement | null;
  _transport?: { submit?: (action: string, params?: any) => any } | null;
  _onAction?: (action: string, params?: any, source?: any) => any;
  get root(): any;
  setState(partial: any, redraw?: boolean): void;
  redraw(): void;
  createChild(ctor: any, stateOrId: any, maybeState?: any): any;
  find(id: string): any;
  mount(container: HTMLElement): void;
  submit(action: string, params?: any): Promise<any>;
  draw(container: HTMLElement): void;
}
