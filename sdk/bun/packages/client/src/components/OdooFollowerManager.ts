import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';
import { i18n } from '@core3/client/i18n';

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
    const root = html.take(container).section.className('o-form-follower-manager').ele() as HTMLElement;

    if (this.def.follower_add_action && available.length) {
      const toggle = html.take(root).button.type('button').className('o-form-chatter-menu-action o-form-follower-add-toggle').ele() as HTMLButtonElement;
      appendIcon(toggle, 'plus');
      html.take(toggle).text(String(this.def.add_follower_label || i18n.tKey('followers.add', {}, 'Add followers'))).attr('aria-expanded', 'false');

      const form = html.take(root).form.className('o-form-follower-add-form').prop('hidden', true).ele() as HTMLFormElement;
      const selectLabel = String(this.def.follower_search_placeholder || i18n.tKey('followers.select', {}, 'Select a follower'));
      const select = html.take(form).select.prop('required', true).attr('aria-label', selectLabel).ele() as HTMLSelectElement;
      html.take(select).option.prop('value', '').replaceText(selectLabel);
      for (const candidate of available) {
        const value = String(candidate.user_id || candidate.id || '');
        html.take(select).option.prop('value', value).replaceText(String(candidate.name || candidate.email || value));
      }
      const actions = html.take(form).div.className('o-form-follower-add-actions').ele() as HTMLDivElement;
      const submit = html.take(actions).button.type('submit').className('o-form-chatter-menu-confirm').replaceText(String(this.def.add_label || i18n.tKey('labels.add', {}, 'Add'))).ele() as HTMLButtonElement;
      const cancel = html.take(actions).button.type('button').className('o-form-chatter-menu-cancel').replaceText(String(this.def.cancel_label || i18n.tKey('labels.cancel', {}, 'Cancel'))).ele() as HTMLButtonElement;
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
      html.take(root).p.className('o-form-chatter-empty').replaceText(String(this.def.no_followers_label || i18n.tKey('followers.empty', {}, 'No followers')));
      return;
    }

    const list = html.take(root).ul.className('o-form-follower-list').ele() as HTMLUListElement;
    for (const follower of followers) {
      const item = html.take(list).li.ele() as HTMLLIElement;
      html.take(item).span.className('o-form-follower-avatar').replaceText(initials(follower.name || follower.actor_name || follower.created_by)).attr('aria-hidden', 'true');
      const identity = html.take(item).span.className('o-form-follower-identity').ele() as HTMLSpanElement;
      const name = html.take(identity).strong.replaceText(String(follower.name || follower.actor_name || follower.created_by || '—')).ele() as HTMLElement;
      if (follower.email) {
        html.take(identity).small.replaceText(String(follower.email));
      }
      if (this.def.follower_remove_action) {
        const removeLabel = String(this.def.remove_follower_label || i18n.tKey('followers.remove', {}, 'Remove follower'));
        const remove = html.take(item).button.type('button').className('o-form-follower-remove').prop('title', removeLabel).ele() as HTMLButtonElement;
        html.take(remove).attr('aria-label', `${remove.title}: ${name.textContent}`);
        appendIcon(remove, 'x');
        html.take(remove).event('click', () => {
          html.take(remove).prop('disabled', true);
          void Promise.resolve(this.submit(String(this.def.follower_remove_action), {
            id: record.id,
            user_id: follower.user_id || follower.id,
        })).finally(() => { html.take(remove).prop('disabled', false); });
        });
      }
    }
  }
}
