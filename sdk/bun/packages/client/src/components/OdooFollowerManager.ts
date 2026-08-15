import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';

function createFluentElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  return html.node(tag) as HTMLElementTagNameMap[K];
}

function initials(value: unknown) {
  const words = String(value || '?').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || '?';
}

export class OdooFollowerManager extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    const record = this.state.record || {};
    const followers = Array.isArray(this.state.followers) ? this.state.followers : [];
    const candidates = Array.isArray(this.state.candidates) ? this.state.candidates : [];
    const followerIds = new Set(followers.map((row: any) => String(row.user_id || row.id || '')));
    const available = candidates.filter((row: any) => !followerIds.has(String(row.user_id || row.id || '')));
    const root = createFluentElement('section');
    html.take(root).className('o-form-follower-manager');
    html.take(container).append(root);

    if (this.def.follower_add_action && available.length) {
      const toggle = createFluentElement('button');
      html.take(toggle).type('button');
      html.take(toggle).className('o-form-chatter-menu-action o-form-follower-add-toggle');
      appendIcon(toggle, 'plus');
      html.take(toggle).text(String(this.def.add_follower_label || 'Add Followers')).attr('aria-expanded', 'false');
      html.take(root).append(toggle);

      const form = createFluentElement('form');
      html.take(form).className('o-form-follower-add-form').prop('hidden', true);
      const select = createFluentElement('select');
      select.required = true;
      html.take(select).attr('aria-label', String(this.def.follower_search_placeholder || 'Select a follower'));
      const placeholder = createFluentElement('option');
      html.take(placeholder).prop('value', '').replaceText(String(this.def.follower_search_placeholder || 'Select a follower'));
      html.take(select).append(placeholder);
      for (const candidate of available) {
        const option = createFluentElement('option');
        html.take(option).prop('value', String(candidate.user_id || candidate.id || '')).replaceText(String(candidate.name || candidate.email || option.value));
        html.take(select).append(option);
      }
      const actions = createFluentElement('div');
      html.take(actions).className('o-form-follower-add-actions');
      const submit = createFluentElement('button');
      html.take(submit).type('submit');
      html.take(submit).className('o-form-chatter-menu-confirm').replaceText(String(this.def.add_label || 'Add'));
      const cancel = createFluentElement('button');
      html.take(cancel).type('button');
      html.take(cancel).className('o-form-chatter-menu-cancel').replaceText(String(this.def.cancel_label || 'Cancel'));
      html.take(actions).append(submit, cancel);
      html.take(form).append(select, actions);
      html.take(root).append(form);
      const setOpen = (open: boolean) => {
        html.take(form).prop('hidden', !open);
        html.take(toggle).attr('aria-expanded', String(open));
        if (open) html.take(select).focus();
      };
      html.take(toggle).event('click', () => setOpen(form.hidden));
      html.take(cancel).event('click', () => setOpen(false));
      html.take(form).event('submit', event => {
        event.preventDefault();
        if (!select.value) return;
        html.take(submit).prop('disabled', true);
        void Promise.resolve(this.submit(String(this.def.follower_add_action), {
          id: record.id,
          user_id: select.value,
        })).finally(() => { html.take(submit).prop('disabled', false); });
      });
    }

    if (!followers.length) {
      const empty = createFluentElement('p');
      html.take(empty).className('o-form-chatter-empty').replaceText(String(this.def.no_followers_label || 'No followers'));
      html.take(root).append(empty);
      return;
    }

    const list = createFluentElement('ul');
    html.take(list).className('o-form-follower-list');
    for (const follower of followers) {
      const item = createFluentElement('li');
      const avatar = createFluentElement('span');
      html.take(avatar).className('o-form-follower-avatar').replaceText(initials(follower.name || follower.actor_name || follower.created_by)).attr('aria-hidden', 'true');
      const identity = createFluentElement('span');
      html.take(identity).className('o-form-follower-identity');
      const name = createFluentElement('strong');
      html.take(name).replaceText(String(follower.name || follower.actor_name || follower.created_by || '—'));
      html.take(identity).append(name);
      if (follower.email) {
        const email = createFluentElement('small');
        html.take(email).replaceText(String(follower.email));
        html.take(identity).append(email);
      }
      html.take(item).append(avatar, identity);
      if (this.def.follower_remove_action) {
        const remove = createFluentElement('button');
        html.take(remove).type('button').className('o-form-follower-remove').prop('title', String(this.def.remove_follower_label || 'Remove follower'));
        html.take(remove).attr('aria-label', `${remove.title}: ${name.textContent}`);
        appendIcon(remove, 'x');
        html.take(remove).event('click', () => {
          html.take(remove).prop('disabled', true);
          void Promise.resolve(this.submit(String(this.def.follower_remove_action), {
            id: record.id,
            user_id: follower.user_id || follower.id,
        })).finally(() => { html.take(remove).prop('disabled', false); });
        });
        html.take(item).append(remove);
      }
      html.take(list).append(item);
    }
    html.take(root).append(list);
  }
}
