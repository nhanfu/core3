import { BaseComponent } from '../runtime.js';
export declare class FormPanel extends BaseComponent {
    def: {};
    _fields: any[];
    constructor(id: any, state: any, def?: {});
    createChild(Ctor: any, stateOrId: any, maybeState: any): BaseComponent;
    registerField(comp: any): any;
    collectValues(): any;
    validate(): boolean;
    submit(action: any, params?: {}): Promise<any>;
    draw(container: any): void;
}
