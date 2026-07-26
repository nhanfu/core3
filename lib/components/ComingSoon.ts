import { BaseComponent } from '../runtime.ts';

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
    artwork.append(this.calendarIcon());

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

  private calendarIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '40');
    svg.setAttribute('height', '40');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    for (const pathValue of [
      'M8 2v4',
      'M16 2v4',
      'M3 10h18',
      'M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
      'm9.5 16 1.5 1.5 3.5-4',
    ]) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathValue);
      svg.append(path);
    }
    return svg;
  }
}
