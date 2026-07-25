import { BaseComponent } from '../runtime.js';
export declare class SplitPanel extends BaseComponent {
    leftComp: any;
    rightComp: any;
    opts: {};
    constructor(id: any, leftComp: any, rightComp: any, opts?: {});
    draw(container: any): void;
}
