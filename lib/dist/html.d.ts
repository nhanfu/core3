export declare class HTML {
    /** @type {HTMLElement} */
    context: HTMLElement;
    /** @type {HTML} */
    get Instance(): HTML;
    /**
     *
     * @param {HTMLElement|string|null|undefined} ele
     * @returns
     */
    take(ele: HTMLElement | string | null | undefined): this;
    getContext(): HTMLElement;
    /**
     * @param {string} node
     */
    add(node: string): this;
    get div(): this;
    get iframe(): this;
    get link(): this;
    get script(): this;
    get header(): this;
    get section(): this;
    get canvas(): this;
    get video(): this;
    get audio(): this;
    get h1(): this;
    get h2(): this;
    get h3(): this;
    get h4(): this;
    get h5(): this;
    get h6(): this;
    get nav(): this;
    get input(): this;
    get select(): this;
    get option(): this;
    get span(): this;
    get small(): this;
    get i(): this;
    get img(): this;
    get button(): this;
    get table(): this;
    get thead(): this;
    get th(): this;
    get tbody(): this;
    get tfooter(): this;
    get trow(): this;
    get tdata(): this;
    get p(): this;
    get textArea(): this;
    get details(): this;
    get summary(): this;
    get br(): this;
    get hr(): this;
    get ul(): this;
    get li(): this;
    get aside(): this;
    get a(): this;
    get form(): this;
    get label(): this;
    get end(): this;
    render(): void;
    /**
     * @param {string} name
     * @param {(...args) => any} handler
     * @param {any[]} args
     */
    event(name: string, handler: (...args: any) => any, ...args: any[]): this;
    /**
     * @param {string} type
     */
    trigger(type: string): this;
    /**
     * @param {string} cls
     */
    className(cls: string): this;
    /**
     * @param {string} id
     */
    id(id: string): this;
    /**
     * @param {string} style
     */
    style(style: string): this;
    text(text: any): this;
    /**
     * @param {string} html
     */
    innerHTML(html: string): this;
    /**
     * @param {string} name
     */
    type(name: string): this;
    /**
     * @param {string} name
     * @param {string} value
     */
    attr(name: string, value: string): this;
    href(value: any): this;
    src(value: any): this;
    /**
     * @param {number} index
     */
    tabIndex(index: number): this;
    /**
     * @param {string} name
     * @param {string} value
     */
    dataAttr(name: string, value: string): this;
    /**
     * @param {string} val
     */
    value(val: string): this;
    endOf(selector: any): this;
    /**
     * Moves the context to the closest ancestor that matches the specified element type.
     * @param {ElementType} type - The element type to find the closest ancestor.
     * @returns {Html} Returns this for chaining.
     */
    closest(type: ElementType): Html;
    clear(): this;
    checkbox(value: any): this;
}
export declare const html: HTML;
