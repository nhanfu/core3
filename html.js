import { Client } from '../clients/client.js';
import { Str } from './ext.js';
import { LangSelect } from './langSelect.js';
import { PositionEnum, ElementType } from '../models/';

export class HtmlEvent {
    static click = 'click';
}
export const Direction =
{
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    left: 'left',
}

export class HTML {
    /** @type {HTMLElement} */
    Context;

    /** @type {HTML} */
    get Instance() {
        return this; // This method is for backward compatibility
    }
    /**
     * 
     * @param {HTMLElement|string|null|undefined} ele 
     * @returns 
     */
    Take(ele) {
        if (ele == null) return this;
        if (typeof (ele) === 'string') this.Context = document.querySelector(ele);
        else this.Context = ele;
        return this;
    }

    GetContext() {
        return this.Context;
    }

    /**
     * @param {string} node
     */
    Add(node) {
        const ele = document.createElement(node);
        if (this.Context) {
            this.Context.appendChild(ele);
            this.Context = ele;
        } else {
            this.Context = ele;
        }
        return this;
    }
    get Div() {
        return this.Add('div');
    }
    get Iframe() {
        return this.Add('iframe');
    }
    get Link() {
        return this.Add('link');
    }
    get Script() {
        return this.Add('script');
    }
    get Header() {
        return this.Add('header');
    }
    get Section() {
        return this.Add('section');
    }
    get Canvas() {
        return this.Add('canvas');
    }
    get Video() {
        return this.Add('video');
    }
    get Audio() {
        return this.Add('audio');
    }
    get H1() {
        return this.Add('h1');
    }
    get H2() {
        return this.Add('h2');
    }
    get H3() {
        return this.Add('h3');
    }
    get H4() {
        return this.Add('h4');
    }
    get H5() {
        return this.Add('h5');
    }
    get H6() {
        return this.Add('h6');
    }
    get Nav() {
        return this.Add('nav');
    }
    get Input() {
        return this.Add('input');
    }
    get Iframe() {
        return this.Add('iframe');
    }
    get Select() {
        return this.Add('select');
    }
    get Option() {
        return this.Add('option');
    }
    get Span() {
        return this.Add('span');
    }
    get Small() {
        return this.Add('small');
    }
    get I() {
        return this.Add('i');
    }
    get Img() {
        return this.Add('img');
    }
    get Button() {
        return this.Add('button');
    }
    get Table() {
        return this.Add('table');
    }
    get Thead() {
        return this.Add('thead');
    }
    get Th() {
        return this.Add('th');
    }
    get TBody() {
        return this.Add('tbody');
    }
    get TFooter() {
        return this.Add('tfoot');
    }
    get TRow() {
        return this.Add('tr');
    }
    get TData() {
        return this.Add('td');
    }
    get P() {
        return this.Add('p');
    }
    get TextArea() {
        return this.Add('textarea');
    }
    get Details() {
        return this.Add('details');
    }
    get Summary() {
        return this.Add('summary');
    }
    get Br() {
        var br = document.createElement("br");
        this.Context.appendChild(br);
        return this;
    }
    get Hr() {
        var hr = document.createElement("hr");
        this.Context.appendChild(hr);
        return this;
    }
    get Ul() {
        return this.Add('ul');
    }
    get Li() {
        return this.Add('li');
    }
    get Aside() {
        return this.Add('aside');
    }
    get A() {
        return this.Add('a');
    }
    get Form() {
        return this.Add('form');
    }
    get Label() {
        return this.Add('label');
    }
    get End() {
        this.Context = this.Context.parentElement;
        return this;
    }
    Render() {
        // Not to do anything here
    }
    /**
     * @param {string} name
     * @param {(...args) => any} handler
     * @param {any[]} args
     */
    Event(name, handler, ...args) {
        this.Context.addEventListener(name, (e) => handler(e, ...args));
        return this;
    }
    /**
     * @param {string} type
     */
    Trigger(type) {
        var e = new Event(type);
        this.Context.dispatchEvent(e);
        return this;
    }

    /**
     * @param {string} cls
     */
    ClassName(cls) {
        if (this.Context.className != "") {
            this.Context.className += (' ' + cls);
        }
        else {
            this.Context.className = cls;
        }
        return this;
    }

    /**
     * @param {string} id
     */
    Id(id) {
        this.Context.id = id;
        return this;
    }

    /**
     * @param {string} style
     */
    Style(style) {
        if (style == null) return this;
        this.Context.style.cssText += style;
        return this;
    }
    /**
     * @param {string} width
     */
    Width(width) {
        this.Context.style.width = width;
        return this;
    }

    /**
     * @param {string} direction
     * @param {number} number
     * @param {string} [unit]
     */
    Padding(direction, number, unit) {
        if (unit == null) unit = 'px';
        return this.Style(`padding-${direction}: ${number}${unit}`);
    }
    /**
     * @param {string} alignment
     */
    TextAlign(alignment) {
        return this.Style("text-align: " + alignment);
    }
    /**
     * @param {string} text
     */
    Text(text) {
        if (text === null || text === undefined) return this;
        var node = new Text(text);
        this.Context.appendChild(node);
        return this;
    }

    Button2(text = '', className = 'button info small', icon = '') {
        this.Button.Render();
        if (icon !== '') {
            this.Span.ClassName(icon).End.Text(' ').Render();
        }
        return this.ClassName(className).IText(text);
    }

    /**
     * @param {string} langKey
     */
    Title(langKey) {
        if (!langKey) {
            return this;
        }
        this.MarkLangProp(this.Context, langKey, "title");
        return this.Attr("title", LangSelect.Get(langKey));
    }

    /**
     * @param {any} direction
     * @param {any} margin
     */
    Margin(direction, margin, unit = "px") {
        return this.Style(`margin-${direction} : ${margin}${unit}`);
    }

    /**
     * @param {string} direction
     * @param {number} margin
     */
    MarginRem(direction, margin) {
        return this.Style(`margin-${direction} : ${margin}rem`);
    }

    /**
     * Inserts a text node into the current HTML context with language-specific translation.
     * @param {string} langKey - The key used to fetch the translated text.
     * @param {...any} parameters - Parameters used for string formatting in the translated text.
     * @returns {Html} Returns the Html instance for chaining.
     */
    IText(langKey, featureId, ...parameters) {
        if (!langKey) {
            return this;
        }
        const translated = LangSelect.Get(langKey, featureId);
        const textContent = parameters.length > 0 ? Str.Format(translated, parameters) : translated;
        const textNode = document.createTextNode(textContent);
        this.MarkLangProp(textNode, langKey, "textContent", parameters);
        textNode["featurename"] = featureId;
        this.Context.appendChild(textNode);
        return this;
    }

    /**
     * @param {string} html
     */
    InnerHTML(html) {
        this.Context.innerHTML = html;
        return this;
    }
    /**
     * @param {boolean} val
     */
    SmallCheckbox(val = false, disabled = false) {
        var attr = disabled ? "disabled" : "enabled";
        this.Label.ClassName("checkbox input-small transition-on style2")
            .Input.Attr(attr, attr).Attr("type", "checkbox").Type("checkbox").End
            .Span.ClassName("check myCheckbox");
        // @ts-ignore
        this.Context.previousElementSibling.checked = val;
        return this;
    }
    /**
     * @param {string} name
     */
    Type(name) {
        // @ts-ignore
        this.Context.type = name;
        return this;
    }
    /**
     * @param {string} name
     * @param {string} value
     */
    Attr(name, value) {
        this.Context.setAttribute(name, value);
        return this;
    }

    Href(value) {
        this.Context.setAttribute("href", value);
        return this;
    }

    Src(value) {
        this.Context.setAttribute("src", value);
        return this;
    }

    /**
     * @param {number} index
     */
    TabIndex(index) {
        this.Context.setAttribute('tabindex', index.toString());
        return this;
    }

    /**
     * @param {string} name
     * @param {string} value
     */
    DataAttr(name, value) {
        this.Context.setAttribute('data-' + name, value);
        return this;
    }

    /**
     * @param {string} langKey
     */
    PlaceHolder(langKey) {
        if (!langKey || langKey.trim() === '') {
            return this;
        }
        this.MarkLangProp(this.Context, langKey, "placeholder");
        return this.Attr("placeholder", LangSelect.Get(langKey));
    }


    /**
     * Marks a language property on a specified node.
     * @param {Node} ctx - The context node to which the language properties are added.
     * @param {string} langKey - The key of the language property.
     * @param {string} propName - The name of the property to mark.
     * @param {...any} parameters - Additional parameters associated with the language property.
     */
    MarkLangProp(ctx, langKey, propName, ...parameters) {
        if (!ctx) return;

        const langKeyProperty = LangSelect.LangKey + propName;
        const langParamProperty = LangSelect.LangParam + propName;

        ctx[langKeyProperty] = langKey;
        if (parameters.length > 0) {
            ctx[langParamProperty] = parameters;
        }

        const prop = ctx[LangSelect.LangProp];
        const newProp = prop ? prop + "," + propName : propName;
        const propArray = newProp.split(",").filter((value, index, self) => self.indexOf(value) === index);
        ctx[LangSelect.LangProp] = propArray.join(",");
    }
    /**
     * @param {string} val
     */
    Value(val) {
        /** @type {HTMLInputElement} */
        // @ts-ignore
        const input = this.Context;
        input.value = val;
        return this;
    }
    /**
     * Adds an icon to the HTML element.
     * @param {string} icon - Icon class or URL to set as background.
     * @returns {Html} Returns this for chaining.
     */
    Icon(icon) {
        const isIconClass = icon && (icon.includes("mif") || icon.includes("fa") || icon.includes("fa-"));
        this.Span.ClassName("icon");
        if (isIconClass) {
            this.ClassName(icon).Render();
        } else {
            this.Style(`background-image: url(${Client.Origin + icon});`).ClassName("iconBg").Render();
        }
        return this;
    }
    /**
     * @param {PositionEnum | string} position
     * @param {string | number} distance
     * @param {string} unit
     */
    Position(position, distance = null, unit = 'px') {
        if (distance == null)
            return this.Style(`position: {${position}}`);
        return this.Style(`position: ${position}; ${position}: ${distance}${unit};`);
    }


    /**
     * Sets up an escape key event listener on the current context.
     * @param {Function} action - Action to execute when the escape key is pressed.
     * @returns {Html} Returns this for chaining.
     */
    Escape(action) {
        const div = this.Context;
        div.tabIndex = -1;
        div.focus();
        div.addEventListener('keydown', (e) => {
            if (e.keyCode === 27) { // Escape key
                const parent = div.parentElement;
                e.stopPropagation();
                action(e);
                parent.focus();
            }
        });
        return this;
    }
    /**
     * Sets an icon for a span element.
     * @param {string} iconClass - Icon class or URL to set as background.
     * @returns {Html} Returns this for chaining.
     */
    IconForSpan(iconClass) {
        if (!iconClass || iconClass.trim().length === 0) {
            return this;
        }
        iconClass = iconClass.trim();
        const span = this.Context;
        this.ClassName("icon");
        const isIconClass = iconClass.includes("mif") || iconClass.includes("fa") || iconClass.includes("fa-");
        if (isIconClass) {
            span.classList.add(iconClass);
        } else {
            span.classList.add("iconBg");
            span.style.backgroundImage = `url(${iconClass})`;
        }
        return this;
    }
    /**
     * Sets the position of the current HTML element to fixed.
     * @param {string} top - The top position in pixels.
     * @param {string} left - The left position in pixels.
     * @returns {Html} Returns this for chaining.
     */
    Floating(top, left) {
        return this.Position(PositionEnum.fixed)
            .Position(Direction.top, top)
            .Position(Direction.left, left);
    }
    /**
     * Inserts HTML content into the current context with optional language translation.
     * @param {string} langKey - Language key for translation.
     * @param {...any} parameters - Parameters for formatting the translation.
     * @returns {Html} Returns this for chaining.
     */
    IHtml(langKey, featureId, ...parameters) {
        if (!langKey) {
            return this;
        }
        const ctx = this.Context;
        const translated = LangSelect.Get(langKey, featureId);
        this.MarkLangProp(ctx, langKey, 'innerHTML', parameters);
        ctx.innerHTML = translated;
        return this;
    }
    /**
     * Sets the colspan attribute for an HTML table cell.
     * @param {number} colSpan - The number of columns to span.
     * @returns {Html} Returns this for chaining.
     */
    ColSpan(colSpan) {
        return this.Attr("colspan", colSpan.toString());
    }

    /**
     * Sets the rowspan attribute for an HTML table cell.
     * @param {number} rowSpan - The number of rows to span.
     * @returns {Html} Returns this for chaining.
     */
    RowSpan(rowSpan) {
        return this.Attr("rowspan", rowSpan.toString());
    }

    /**
     * Ends the current context at the specified element type or selector.
     * @param {string|ElementType} selector - The selector or element type to end at.
     * @returns {Html} Returns this for chaining.
     */
    EndOf(selector) {
        if (typeof selector === "object" && selector.toString) { // Assuming ElementType is an object with toString()
            selector = selector.toString();
        }

        let result = this.Context;
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

        this.Context = result;
        return this;
    }

    /**
     * Moves the context to the closest ancestor that matches the specified element type.
     * @param {ElementType} type - The element type to find the closest ancestor.
     * @returns {Html} Returns this for chaining.
     */
    Closest(type) {
        if (this.Context && typeof this.Context.closest === 'function') {
            this.Context = this.Context.closest(type.toString());
        }
        return this;
    }

    Clear() {
        this.Context.innerHTML = '';
        return this;
    }

    Checkbox(value) {
        this.Add(ElementType.input);
        var checkbox = this.Context;
        if (checkbox instanceof HTMLInputElement) {
            checkbox.setAttribute("type", "checkbox");
            checkbox.checked = value ?? false;
        }
        return this;
    }

    /**
     * Sets the sticky position to the HTML context.
     * @param {string} [top=null] - Set top to '0px' if it's aligned top with previous element.
     * @param {string} [left=null] - Set left to '0px' if it's aligned left with previous element.
     * @returns {HTML} Returns the instance of the class for chaining.
     */
    Sticky(top = null, left = null) {
        const ctx = this.Context;
        if (!ctx) {
            return this;
        }

        if (ctx.previousElementSibling && ctx.tagName === ctx.previousElementSibling.tagName) {
            if (left === '0') {
                left = `${ctx.offsetLeft}px`;
            } else if (top === '0') {
                top = `${ctx.offsetTop}px`;
            }
        }

        if (top !== null) {
            this.Style(`top: ${top};`);
        }

        if (left !== null) {
            this.Style(`left: ${left};`);
        }

        return this.Style("position: sticky; z-index: 1;");
    }

    ForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            callback(array[index], index);
        }
        return this;
    }

    Display(shouldShow) {
        const ele = this.Context;
        ele.style.display = shouldShow ? '' : 'none';
        return this;
    }

    Visibility(visible) {
        var ele = this.Context;
        ele.style.visibility = visible ? "" : "hidden";
        return this;
    }
}

export const Html = new HTML();