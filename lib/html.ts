export class HTML {
    /** @type {HTMLElement} */
    context;

    /** @type {HTML} */
    get Instance() {
        return this; // This method is for backward compatibility
    }
    /**
     * 
     * @param {HTMLElement|string|null|undefined} ele 
     * @returns 
     */
    take(ele) {
        if (ele == null) return this;
        if (typeof (ele) === 'string') this.context = document.querySelector(ele);
        else this.context = ele;
        return this;
    }

    getContext() {
        return this.context;
    }

    /**
     * @param {string} node
     */
    add(node) {
        const ele = document.createElement(node);
        if (this.context) {
            this.context.appendChild(ele);
            this.context = ele;
        } else {
            this.context = ele;
        }
        return this;
    }
    get div() {
        return this.add('div');
    }
    get iframe() {
        return this.add('iframe');
    }
    get link() {
        return this.add('link');
    }
    get script() {
        return this.add('script');
    }
    get header() {
        return this.add('header');
    }
    get section() {
        return this.add('section');
    }
    get canvas() {
        return this.add('canvas');
    }
    get video() {
        return this.add('video');
    }
    get audio() {
        return this.add('audio');
    }
    get h1() {
        return this.add('h1');
    }
    get h2() {
        return this.add('h2');
    }
    get h3() {
        return this.add('h3');
    }
    get h4() {
        return this.add('h4');
    }
    get h5() {
        return this.add('h5');
    }
    get h6() {
        return this.add('h6');
    }
    get nav() {
        return this.add('nav');
    }
    get input() {
        return this.add('input');
    }
    get select() {
        return this.add('select');
    }
    get option() {
        return this.add('option');
    }
    get span() {
        return this.add('span');
    }
    get small() {
        return this.add('small');
    }
    get i() {
        return this.add('i');
    }
    get img() {
        return this.add('img');
    }
    get button() {
        return this.add('button');
    }
    get table() {
        return this.add('table');
    }
    get thead() {
        return this.add('thead');
    }
    get th() {
        return this.add('th');
    }
    get tbody() {
        return this.add('tbody');
    }
    get tfooter() {
        return this.add('tfoot');
    }
    get trow() {
        return this.add('tr');
    }
    get tdata() {
        return this.add('td');
    }
    get p() {
        return this.add('p');
    }
    get textArea() {
        return this.add('textarea');
    }
    get details() {
        return this.add('details');
    }
    get summary() {
        return this.add('summary');
    }
    get br() {
        var br = document.createElement("br");
        this.context.appendChild(br);
        return this;
    }
    get hr() {
        var hr = document.createElement("hr");
        this.context.appendChild(hr);
        return this;
    }
    get ul() {
        return this.add('ul');
    }
    get li() {
        return this.add('li');
    }
    get aside() {
        return this.add('aside');
    }
    get a() {
        return this.add('a');
    }
    get form() {
        return this.add('form');
    }
    get label() {
        return this.add('label');
    }
    get end() {
        this.context = this.context.parentElement;
        return this;
    }
    render() {
        // Not to do anything here
    }
    /**
     * @param {string} name
     * @param {(...args) => any} handler
     * @param {any[]} args
     */
    event(name, handler, ...args) {
        this.context.addEventListener(name, (e) => handler(e, ...args));
        return this;
    }
    /**
     * @param {string} type
     */
    trigger(type) {
        var e = new Event(type);
        this.context.dispatchEvent(e);
        return this;
    }

    /**
     * @param {string} cls
     */
    className(cls) {
        if (this.context.className != "") {
            this.context.className += (' ' + cls);
        }
        else {
            this.context.className = cls;
        }
        return this;
    }

    /**
     * @param {string} id
     */
    id(id) {
        this.context.id = id;
        return this;
    }

    /**
     * @param {string} style
     */
    style(style) {
        if (style == null) return this;
        this.context.style.cssText += style;
        return this;
    }
    
    text(text) {
        if (text === null || text === undefined) return this;
        var node = new Text(text);
        this.context.appendChild(node);
        return this;
    }

    /**
     * @param {string} html
     */
    innerHTML(html) {
        this.context.innerHTML = html;
        return this;
    }
    
    /**
     * @param {string} name
     */
    type(name) {
        // @ts-ignore
        this.context.type = name;
        return this;
    }
    /**
     * @param {string} name
     * @param {string} value
     */
    attr(name, value) {
        this.context.setAttribute(name, value);
        return this;
    }

    href(value) {
        this.context.setAttribute("href", value);
        return this;
    }

    src(value) {
        this.context.setAttribute("src", value);
        return this;
    }

    /**
     * @param {number} index
     */
    tabIndex(index) {
        this.context.setAttribute('tabindex', index.toString());
        return this;
    }

    /**
     * @param {string} name
     * @param {string} value
     */
    dataAttr(name, value) {
        this.context.setAttribute('data-' + name, value);
        return this;
    }

    /**
     * @param {string} val
     */
    value(val) {
        /** @type {HTMLInputElement} */
        // @ts-ignore
        const input = this.context;
        input.value = val;
        return this;
    }

    endOf(selector) {
        if (typeof selector === "object" && selector.toString) { // Assuming ElementType is an object with toString()
            selector = selector.toString();
        }

        let result = this.context;
        while (result !== null) {
            // @ts-ignore
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

    /**
     * Moves the context to the closest ancestor that matches the specified element type.
     * @param {ElementType} type - The element type to find the closest ancestor.
     * @returns {Html} Returns this for chaining.
     */
    closest(type) {
        if (this.context && typeof this.context.closest === 'function') {
            this.context = this.context.closest(type.toString());
        }
        return this;
    }

    clear() {
        this.context.innerHTML = '';
        return this;
    }

    checkbox(value) {
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
