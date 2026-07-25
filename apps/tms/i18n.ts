class I18n {
  lang: string = 'en';
  _cache: Map<string, Record<string, string>> = new Map(); // 'en:fleet' → { text: translated, ... }
  _listeners: Set<(lang: string) => void> = new Set();

  async setLang(lang: string) {
    if (lang === this.lang && this._cache.has(`${lang}:*`)) return;
    this.lang = lang;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);
    // Fetch global strings
    await this.prefetch('*');
    // Notify listeners (triggers page redraw if wired up)
    this._listeners.forEach((fn) => fn(lang));
  }

  async prefetch(page: string) {
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
  t(page: string, component: string | null, text: string) {
    const pageBucket   = this._cache.get(`${this.lang}:${page}`) || {};
    const globalBucket = this._cache.get(`${this.lang}:*`)        || {};
    const lookup = component ? `${component}::${text}` : text;
    return pageBucket[lookup]
      ?? globalBucket[lookup]
      ?? pageBucket[text]
      ?? globalBucket[text]
      ?? text;
  }

  onChange(fn: (lang: string) => void) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
}

export const i18n = new I18n();
