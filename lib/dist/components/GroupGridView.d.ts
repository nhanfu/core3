import { BaseComponent } from '../runtime.js';
export declare class GroupGridView extends BaseComponent {
    defs: any[];
    constructor(id: any, state: any, defs?: any[]);
    _cellState(def: any, row: any): {
        value: any;
        color: any;
        currency?: undefined;
        format?: undefined;
        overdue?: undefined;
        actions?: undefined;
        row?: undefined;
        secondary?: undefined;
    } | {
        color?: undefined;
        value: any;
        currency: any;
        format?: undefined;
        overdue?: undefined;
        actions?: undefined;
        row?: undefined;
        secondary?: undefined;
    } | {
        color?: undefined;
        currency?: undefined;
        value: any;
        format: any;
        overdue?: undefined;
        actions?: undefined;
        row?: undefined;
        secondary?: undefined;
    } | {
        color?: undefined;
        currency?: undefined;
        value: any;
        format: any;
        overdue: boolean;
        actions?: undefined;
        row?: undefined;
        secondary?: undefined;
    } | {
        color?: undefined;
        currency?: undefined;
        format?: undefined;
        overdue?: undefined;
        value: boolean;
        actions?: undefined;
        row?: undefined;
        secondary?: undefined;
    } | {
        color?: undefined;
        currency?: undefined;
        format?: undefined;
        overdue?: undefined;
        actions: any;
        row: any;
        value?: undefined;
        secondary?: undefined;
    } | {
        color?: undefined;
        currency?: undefined;
        format?: undefined;
        overdue?: undefined;
        actions?: undefined;
        row?: undefined;
        value: any;
        secondary: any;
    };
    draw(container: any): void;
}
