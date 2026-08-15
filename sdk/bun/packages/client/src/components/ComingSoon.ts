import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';

export type ComingSoonState = {
  eyebrow?: string;
  title?: string;
  description?: string;
  icon?: string;
};

/**
 * Declarative placeholder for routes that exist in product navigation but are
 * intentionally unavailable in the reference application.
 */
export class ComingSoon extends BaseComponent {
  declare state: ComingSoonState;

  draw(container: HTMLElement) {
    const {
      eyebrow = 'Coming soon',
      title = 'This feature is in development',
      description = '',
      icon = 'calendar',
    } = this.state;

    const section = html.take(container).section.className('coming-soon')
      .attr('aria-labelledby', `${this.id}-title`).getContext() as HTMLElement;

    const artwork = html.take(section).div.className('coming-soon-artwork')
      .attr('aria-hidden', 'true').dataAttr('icon', icon).getContext() as HTMLDivElement;
    appendIcon(artwork, icon);

    const copy = html.take(section).div.className('coming-soon-copy').getContext() as HTMLDivElement;

    html.take(copy).p.className('coming-soon-eyebrow').text(eyebrow);

    html.take(copy).h2.id(`${this.id}-title`).className('coming-soon-title').text(title);

    if (description) {
      html.take(copy).p.className('coming-soon-description').text(description);
    }
  }
}
