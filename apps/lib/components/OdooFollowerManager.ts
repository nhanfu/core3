import { BaseComponent } from './BaseComponent.ts';
import { appendIcon } from './Icon.ts';

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
    const root = document.createElement('section');
    root.className = 'o-form-follower-manager';
    container.appendChild(root);

    if (this.def.follower_add_action && available.length) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'o-form-chatter-menu-action o-form-follower-add-toggle';
      appendIcon(toggle, 'plus');
      toggle.append(String(this.def.add_follower_label || 'Add Followers'));
      toggle.setAttribute('aria-expanded', 'false');
      root.appendChild(toggle);

      const form = document.createElement('form');
      form.className = 'o-form-follower-add-form';
      form.hidden = true;
      const select = document.createElement('select');
      select.required = true;
      select.setAttribute('aria-label', String(this.def.follower_search_placeholder || 'Select a follower'));
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = String(this.def.follower_search_placeholder || 'Select a follower');
      select.appendChild(placeholder);
      for (const candidate of available) {
        const option = document.createElement('option');
        option.value = String(candidate.user_id || candidate.id || '');
        option.textContent = String(candidate.name || candidate.email || option.value);
        select.appendChild(option);
      }
      const actions = document.createElement('div');
      actions.className = 'o-form-follower-add-actions';
      const submit = document.createElement('button');
      submit.type = 'submit';
      submit.className = 'o-form-chatter-menu-confirm';
      submit.textContent = String(this.def.add_label || 'Add');
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'o-form-chatter-menu-cancel';
      cancel.textContent = String(this.def.cancel_label || 'Cancel');
      actions.append(submit, cancel);
      form.append(select, actions);
      root.appendChild(form);
      const setOpen = (open: boolean) => {
        form.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        if (open) select.focus();
      };
      toggle.addEventListener('click', () => setOpen(form.hidden));
      cancel.addEventListener('click', () => setOpen(false));
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (!select.value) return;
        submit.disabled = true;
        void Promise.resolve(this.submit(String(this.def.follower_add_action), {
          id: record.id,
          user_id: select.value,
        })).finally(() => { submit.disabled = false; });
      });
    }

    if (!followers.length) {
      const empty = document.createElement('p');
      empty.className = 'o-form-chatter-empty';
      empty.textContent = String(this.def.no_followers_label || 'No followers');
      root.appendChild(empty);
      return;
    }

    const list = document.createElement('ul');
    list.className = 'o-form-follower-list';
    for (const follower of followers) {
      const item = document.createElement('li');
      const avatar = document.createElement('span');
      avatar.className = 'o-form-follower-avatar';
      avatar.textContent = initials(follower.name || follower.actor_name || follower.created_by);
      avatar.setAttribute('aria-hidden', 'true');
      const identity = document.createElement('span');
      identity.className = 'o-form-follower-identity';
      const name = document.createElement('strong');
      name.textContent = String(follower.name || follower.actor_name || follower.created_by || '—');
      identity.appendChild(name);
      if (follower.email) {
        const email = document.createElement('small');
        email.textContent = String(follower.email);
        identity.appendChild(email);
      }
      item.append(avatar, identity);
      if (this.def.follower_remove_action) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'o-form-follower-remove';
        remove.title = String(this.def.remove_follower_label || 'Remove follower');
        remove.setAttribute('aria-label', `${remove.title}: ${name.textContent}`);
        appendIcon(remove, 'x');
        remove.addEventListener('click', () => {
          remove.disabled = true;
          void Promise.resolve(this.submit(String(this.def.follower_remove_action), {
            id: record.id,
            user_id: follower.user_id || follower.id,
          })).finally(() => { remove.disabled = false; });
        });
        item.appendChild(remove);
      }
      list.appendChild(item);
    }
    root.appendChild(list);
  }
}
