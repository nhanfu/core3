import { BaseComponent } from '../runtime.js';
export declare class GridView extends BaseComponent {
    defs: any[];
    constructor(id: any, state: any, defs?: any[]);
    _cellState(def: any, row: any): {
        value: any;
        color: any;
        name?: undefined;
        src?: undefined;
        size?: undefined;
        currency?: undefined;
        format?: undefined;
        overdue?: undefined;
        actions?: undefined;
        row?: undefined;
        secondary?: undefined;
    } | {
        value: any;
        currency: any;
        name?: undefined;
        src?: undefined;
        size?: undefined;
        color?: undefined;
        format?: undefined;
        overdue?: undefined;
        actions?: undefined;
        row?: undefined;
        secondary?: undefined;
    } | {
        value: any;
        format: any;
        name?: undefined;
        src?: undefined;
        size?: undefined;
        color?: undefined;
        currency?: undefined;
        overdue?: undefined;
        actions?: undefined;
        row?: undefined;
        secondary?: undefined;
    } | {
        value: any;
        format: any;
        overdue: boolean;
        name?: undefined;
        src?: undefined;
        size?: undefined;
        color?: undefined;
        currency?: undefined;
        actions?: undefined;
        row?: undefined;
        secondary?: undefined;
    } | {
        actions: any;
        row: any;
        name?: undefined;
        src?: undefined;
        size?: undefined;
        color?: undefined;
        currency?: undefined;
        format?: undefined;
        overdue?: undefined;
        value?: undefined;
        secondary?: undefined;
    } | {
        name: any;
        src: any;
        size: any;
        color?: undefined;
        currency?: undefined;
        format?: undefined;
        overdue?: undefined;
        actions?: undefined;
        row?: undefined;
        value?: undefined;
        secondary?: undefined;
    } | {
        name?: undefined;
        src?: undefined;
        size?: undefined;
        value: any;
        color?: undefined;
        currency?: undefined;
        format?: undefined;
        overdue?: undefined;
        actions?: undefined;
        row?: undefined;
        secondary?: undefined;
    } | {
        name?: undefined;
        src?: undefined;
        size?: undefined;
        value: any;
        secondary: any;
        color?: undefined;
        currency?: undefined;
        format?: undefined;
        overdue?: undefined;
        actions?: undefined;
        row?: undefined;
    };
    draw(container: any): void;
}
