import { BaseComponent } from '../runtime.js';
export declare class ContextMenu extends BaseComponent {
    items: any[];
    _outsideHandler: () => void;
    constructor(id: any, state: any, items?: any[]);
    draw(container: any): void;
}
