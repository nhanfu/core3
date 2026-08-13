import { BaseComponent } from '@core3/client/components/BaseComponent';

/** Generic clickable option group with a YAML-defined action. */
export class ChoiceGroup extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    const section = document.createElement('section');
    section.className = this.def.class || 'drawer-section';
    const title = document.createElement('div');
    title.className = 'drawer-section-title';
    title.textContent = this.def.title || '';
    section.appendChild(title);
    const group = document.createElement('div');
    group.className = this.def.group_class || 'lang-radio-group';
    const current = this.state.record?.[this.def.value];
    for (const option of this.def.options || []) {
      const card = document.createElement('div');
      card.className = `${this.def.option_class || 'lang-radio'}${String(option.value) === String(current || '') ? ' selected' : ''}`;
      card.textContent = option.label || option.value || '';
      card.addEventListener('click', () => {
        group.querySelectorAll(`.${this.def.option_class || 'lang-radio'}`).forEach(item => item.classList.remove('selected'));
        card.classList.add('selected');
        void this.submit(this.def.action, { [this.def.value]: option.value });
      });
      group.appendChild(card);
    }
    section.appendChild(group);
    container.appendChild(section);
  }
}
