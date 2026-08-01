import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500', 'bg-purple-500',
];

const SIZE_CLASSES = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' };

function getInitials(name) {
  return (name || '')
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getAvatarColor(name) {
  const code = (name || ' ').charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export class AvatarCell extends BaseComponent {
  draw(container) {
    const { name = '', src = null, size = 'sm' } = this.state;
    const sizeCls = SIZE_CLASSES[size] || SIZE_CLASSES.sm;

    if (src) {
      html.take(container).img
        .className(`${sizeCls} rounded-full object-cover`)
        .src(src)
        .attr('alt', String(name))
        .attr('title', String(name));
    } else {
      const colorCls = getAvatarColor(name);
      html.take(container).span
        .className(`${sizeCls} ${colorCls} inline-flex items-center justify-center rounded-full text-white font-medium`)
        .attr('title', String(name))
        .text(getInitials(name) || '?');
    }
  }
}
