import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';

export class FormPanel extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || { saving: false, dirty: false, values: {}, errors: {} });
    this.def = def;
    this._fields = [];
  }

  registerField(comp) {
    this._fields.push(comp);
    comp.parent = this;
    if (!this.children.includes(comp)) this.children.push(comp);
    return comp;
  }

  collectValues() {
    const values = {};
    for (const f of this._fields) {
      const key = (f.def && f.def.field) || f.id;
      values[key] = f.state.value;
    }
    return values;
  }

  validate() {
    let valid = true;
    for (const f of this._fields) {
      if (f.def?.required && (f.state.value === '' || f.state.value == null)) {
        f.setState({ error: 'This field is required' }, false);
        f.redraw();
        valid = false;
      }
    }
    return valid;
  }

  async submit(action, params = {}) {
    if (!this.validate()) return null;
    this.setState({ saving: true }, false);
    const values = this.collectValues();
    try {
      const result = await super.submit(action, { ...values, ...params });
      this.setState({ saving: false, dirty: false }, false);
      return result;
    } catch (e) {
      this.setState({ saving: false }, false);
      throw e;
    }
  }

  draw(container) {
    const { saving = false } = this.state;
    const panel = html.take(container).div.className('bg-white rounded-xl border border-gray-200 p-6').getContext();

    if (this.def.title) html.take(panel).h3.className('text-lg font-semibold text-gray-900 mb-5').text(this.def.title);

    if (saving) {
      const savDiv = html.take(panel).div.className('mb-3 text-sm text-indigo-600 flex items-center gap-2').getContext();
      html.take(savDiv).span.className('animate-spin inline-block').text('⟳');
      html.take(savDiv).text(' Saving…');
    }

    html.take(panel).div.className('flex flex-col gap-4').dataAttr('form-fields', '');
    html.take(panel).div.className('flex gap-2 mt-6 pt-5 border-t border-gray-100').dataAttr('form-actions', '');
  }
}
