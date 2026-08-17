import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';

/** Generic clickable option group with a YAML-defined action. */
export class ChoiceGroup extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    const section = html.take(container).section.className(this.def.class || this.def.section_class || 'drawer-section').ele() as HTMLElement;
    html.take(section).div.className(this.def.title_class || 'drawer-section-title').text(this.def.title || '');
    const group = html.take(section).div.className(this.def.group_class || 'lang-radio-group').ele() as HTMLDivElement;
    const current = this.state.record?.[this.def.value];
    for (const option of this.def.options || []) {
      const card = html.take(group).div.className(`${this.def.option_class || 'lang-radio'}${String(option.value) === String(current || '') ? ' selected' : ''}`)
        .text(option.label || option.value || '').event('click', () => {
        group.querySelectorAll(`.${this.def.option_class || 'lang-radio'}`).forEach(item => html.take(item).toggleClass('selected', false));
        html.take(card).toggleClass('selected', true);
        void this.submit(this.def.action, { [this.def.value]: option.value });
        }).ele() as HTMLDivElement;
    }
  }
}
