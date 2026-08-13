import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';

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

    const section = document.createElement('section');
    section.className = 'coming-soon';
    section.setAttribute('aria-labelledby', `${this.id}-title`);

    const artwork = document.createElement('div');
    artwork.className = 'coming-soon-artwork';
    artwork.setAttribute('aria-hidden', 'true');
    artwork.dataset.icon = icon;
    appendIcon(artwork, icon);

    const copy = document.createElement('div');
    copy.className = 'coming-soon-copy';

    const eyebrowElement = document.createElement('p');
    eyebrowElement.className = 'coming-soon-eyebrow';
    eyebrowElement.textContent = eyebrow;

    const titleElement = document.createElement('h2');
    titleElement.id = `${this.id}-title`;
    titleElement.className = 'coming-soon-title';
    titleElement.textContent = title;

    copy.append(eyebrowElement, titleElement);
    if (description) {
      const descriptionElement = document.createElement('p');
      descriptionElement.className = 'coming-soon-description';
      descriptionElement.textContent = description;
      copy.append(descriptionElement);
    }

    section.append(artwork, copy);
    container.append(section);
  }
}
