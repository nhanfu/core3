export enum SvgTag {
    Svg = 'svg',
    Group = 'g',
    Path = 'path',
    Rect = 'rect',
    Circle = 'circle',
    Line = 'line',
    Text = 'text',
    Polygon = 'polygon',
    Polyline = 'polyline',
}

type HtmlHandler = (...args: any[]) => any;

export class HTML {
    context: any = null;

    get Instance(): HTML {
        return this; // This method is for backward compatibility
    }
    take(ele: any): this {
        if (ele == null) {
            this.context = null;
            return this;
        }
        if (typeof (ele) === 'string') this.context = document.querySelector(ele);
        else this.context = ele;
        return this;
    }

    ele(): any {
        return this.context;
    }

    attach(...nodes: Node[]): this {
        for (const node of nodes) this.context.appendChild(node);
        return this;
    }

    remove(): this {
        this.context?.remove();
        return this;
    }

    prepend(...nodes: (Node | string)[]): this {
        this.context.prepend(...nodes);
        return this;
    }

    before(...nodes: (Node | string)[]): this {
        this.context.before(...nodes);
        return this;
    }

    focus(options?: FocusOptions): this {
        this.context.focus(options);
        return this;
    }

    click(): this {
        this.context.click();
        return this;
    }

    dispatch(event: Event): this {
        this.context.dispatchEvent(event);
        return this;
    }

    add(node: string): this {
        const ele = document.createElement(node);
        if (this.context) {
            this.context.appendChild(ele);
            this.context = ele;
        } else {
            this.context = ele;
        }
        return this;
    }

    node(tag: string): any {
        const parent = this.context;
        this.context = null;
        const element = this.add(tag).ele();
        this.context = parent;
        return element;
    }
    svg(node: SvgTag | string) {
        const ele = document.createElementNS('http://www.w3.org/2000/svg', node);
        if (this.context) {
            this.context.appendChild(ele);
            this.context = ele;
        } else {
            this.context = ele;
        }
        return this;
    }
    get div(): this {
        return this.add('div');
    }
    get iframe(): this {
        return this.add('iframe');
    }
    get link(): this {
        return this.add('link');
    }
    get script(): this {
        return this.add('script');
    }
    get header(): this {
        return this.add('header');
    }
    get section(): this {
        return this.add('section');
    }
    get article(): this {
        return this.add('article');
    }
    get time(): this {
        return this.add('time');
    }
    get fieldset(): this {
        return this.add('fieldset');
    }
    get legend(): this {
        return this.add('legend');
    }
    get canvas(): this {
        return this.add('canvas');
    }
    get video(): this {
        return this.add('video');
    }
    get audio(): this {
        return this.add('audio');
    }
    get h1(): this {
        return this.add('h1');
    }
    get h2(): this {
        return this.add('h2');
    }
    get h3(): this {
        return this.add('h3');
    }
    get h4(): this {
        return this.add('h4');
    }
    get h5(): this {
        return this.add('h5');
    }
    get h6(): this {
        return this.add('h6');
    }
    get strong(): this {
        return this.add('strong');
    }
    get nav(): this {
        return this.add('nav');
    }
    get input(): this {
        return this.add('input');
    }
    get textarea(): this {
        return this.add('textarea');
    }
    get label(): this {
        return this.add('label');
    }
    get select(): this {
        return this.add('select');
    }
    get option(): this {
        return this.add('option');
    }
    get span(): this {
        return this.add('span');
    }
    get small(): this {
        return this.add('small');
    }
    get sup(): this {
        return this.add('sup');
    }
    get i(): this {
        return this.add('i');
    }
    get img(): this {
        return this.add('img');
    }
    get button(): this {
        return this.add('button');
    }
    get table(): this {
        return this.add('table');
    }
    get thead(): this {
        return this.add('thead');
    }
    get th(): this {
        return this.add('th');
    }
    get tbody(): this {
        return this.add('tbody');
    }
    get tfooter(): this {
        return this.add('tfoot');
    }
    get trow(): this {
        return this.add('tr');
    }
    get tdata(): this {
        return this.add('td');
    }
    get p(): this {
        return this.add('p');
    }
    get textArea(): this {
        return this.add('textarea');
    }
    get details(): this {
        return this.add('details');
    }
    get summary(): this {
        return this.add('summary');
    }
    get br(): this {
        var br = document.createElement("br");
        this.context.appendChild(br);
        return this;
    }
    get hr(): this {
        var hr = document.createElement("hr");
        this.context.appendChild(hr);
        return this;
    }
    get ul(): this {
        return this.add('ul');
    }
    get li(): this {
        return this.add('li');
    }
    get aside(): this {
        return this.add('aside');
    }
    get a(): this {
        return this.add('a');
    }
    get form(): this {
        return this.add('form');
    }
    get end(): this {
        this.context = this.context.parentElement;
        return this;
    }
    render(): void {
        // Not to do anything here
    }
    event(name: string, handler: HtmlHandler, ...args: any[]): this {
        this.context.addEventListener(name, args.length ? (e) => handler(e, ...args) : handler);
        return this;
    }

    off(name: string, handler: EventListenerOrEventListenerObject): this {
        this.context.removeEventListener(name, handler);
        return this;
    }
    trigger(type: string): this {
        var e = new Event(type);
        this.context.dispatchEvent(e);
        return this;
    }

    command(name: string, value: string | null = null): this {
        document.execCommand(name, false, value);
        return this;
    }

    className(cls: string): this {
        if (this.context.className != "") {
            this.context.className += (' ' + cls);
        }
        else {
            this.context.className = cls;
        }
        return this;
    }

    toggleClass(cls: string, force?: boolean): this {
        this.context.classList.toggle(cls, force);
        return this;
    }

    id(id: string): this {
        this.context.id = id;
        return this;
    }

    style(style: string | null | undefined): this {
        if (style == null) return this;
        this.context.style.cssText += style;
        return this;
    }

    css(name: string, value: any): this {
        this.context.style[name] = value;
        return this;
    }
    
    text(text: string | number | null | undefined): this {
        if (text === null || text === undefined) return this;
        var node = new Text(String(text));
        this.context.appendChild(node);
        return this;
    }

    replaceText(text: unknown): this {
        this.context.textContent = text == null ? '' : String(text);
        return this;
    }

    innerHTML(html: string): this {
        this.context.innerHTML = html;
        return this;
    }
    
    type(name: string) {
        this.context?.setAttribute('type', name);
        return this;
    }
    attr(name: string, value: string) {
        this.context?.setAttribute(name, value);
        return this;
    }

    prop(name: string, value: any): this {
        this.context[name] = value;
        return this;
    }

    href(value: string): this {
        this.context.setAttribute("href", value);
        return this;
    }

    src(value: string): this {
        this.context.setAttribute("src", value);
        return this;
    }

    tabIndex(index: number): this {
        this.context.setAttribute('tabindex', index.toString());
        return this;
    }

    dataAttr(name: string, value: string): this {
        this.context.setAttribute('data-' + name, value);
        return this;
    }

    value(val: string) {
        if (this.context instanceof HTMLInputElement || this.context instanceof HTMLSelectElement || this.context instanceof HTMLTextAreaElement) {
            this.context.value = val;
        }
        return this;
    }

    endOf(selector: string | { toString(): string }): this {
        if (typeof selector === "object" && selector.toString) { // Assuming ElementType is an object with toString()
            selector = selector.toString();
        }

        let result = this.context;
        while (result !== null) {
            if (result.querySelector(selector) !== null) {
                break;
            } else {
                result = result.parentElement;
            }
        }

        if (result === null) {
            throw new Error("Cannot find the element of selector " + selector);
        }

        this.context = result;
        return this;
    }

    closest(type: { toString(): string } | string): this {
        if (this.context && typeof this.context.closest === 'function') {
            this.context = this.context.closest(type.toString());
        }
        return this;
    }

    clear(): this {
        this.context.innerHTML = '';
        return this;
    }

    checkbox(value?: boolean): this {
        this.add('input');
        var checkbox = this.context;
        if (checkbox instanceof HTMLInputElement) {
            checkbox.setAttribute("type", "checkbox");
            checkbox.checked = value ?? false;
        }
        return this;
    }
}

export const html = new HTML();
