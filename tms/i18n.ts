class I18n {
  lang = 'en';
  _cache = new Map(); // 'en:fleet' → { text: translated, ... }
  _listeners = new Set();

  async setLang(lang) {
    if (lang === this.lang && this._cache.has(`${lang}:*`)) return;
    this.lang = lang;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);
    // Fetch global strings
    await this.prefetch('*');
    // Notify listeners (triggers page redraw if wired up)
    this._listeners.forEach(fn => fn(lang));
  }

  async prefetch(page) {
    const key = `${this.lang}:${page}`;
    if (this._cache.has(key)) return;
    try {
      const res = await fetch(`/api/v1/i18n?lang=${encodeURIComponent(this.lang)}&page=${encodeURIComponent(page)}`);
      if (res.ok) {
        this._cache.set(key, await res.json());
      } else {
        this._cache.set(key, {}); // cache empty to avoid re-fetching
      }
    } catch {
      this._cache.set(key, {});
    }
  }

  // Translate: looks up page-specific then global
  t(page, component, text) {
    const pageBucket   = this._cache.get(`${this.lang}:${page}`) || {};
    const globalBucket = this._cache.get(`${this.lang}:*`)        || {};
    const lookup = component ? `${component}::${text}` : text;
    return pageBucket[lookup]
      ?? globalBucket[lookup]
      ?? pageBucket[text]
      ?? globalBucket[text]
      ?? text;
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
}

export const i18n = new I18n();
