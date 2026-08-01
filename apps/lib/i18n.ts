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
      const token = localStorage.getItem('tms_token');
      const res = await fetch(
        `/api/i18n?lang=${encodeURIComponent(this.lang)}&page=${encodeURIComponent(page)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (res.ok) {
        this._cache.set(key, await res.json());
      } else {
        this._cache.set(key, {}); // cache empty to avoid re-fetching
      }
    } catch {
      this._cache.set(key, {});
    }
  }

  hydrate(page: string, payload: { lang?: string; page?: Record<string, string>; global?: Record<string, string> } = {}) {
    const lang = payload.lang || this.lang;
    if (lang !== this.lang) {
      this.lang = lang;
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('data-lang', lang);
    }
    if (payload.page) this._cache.set(`${lang}:${page}`, payload.page);
    if (payload.global) this._cache.set(`${lang}:*`, payload.global);
  }

  translatePageConfig(page: string, config: any) {
    const displayKeys = new Set([
      'title', 'label', 'description', 'placeholder', 'search_placeholder',
      'greeting', 'eyebrow', 'action_label', 'from_label', 'to_label',
      'all_label', 'clear_label', 'confirm', 'message', 'options',
      'logo_title', 'logo_subtitle', 'submit_label', 'loading_label',
      'required_message', 'credentials_label', 'credentials',
    ]);
    const walk = (value: any, key = '', component: string | null = null, display = false): any => {
      if (typeof value === 'string') return display ? this.t(page, component, value) : value;
      if (Array.isArray(value)) return value.map((item) => walk(item, key, component, display || key === 'breadcrumb'));
      if (!value || typeof value !== 'object') return value;
      const nextComponent = typeof value.type === 'string' ? value.type : component;
      const result: Record<string, any> = {};
      for (const [childKey, childValue] of Object.entries(value)) {
        if (childKey === 'datasources' || childKey === 'data' || childKey === 'meta') {
          result[childKey] = childValue;
          continue;
        }
        result[childKey] = walk(
          childValue,
          childKey,
          nextComponent,
          displayKeys.has(childKey) || childKey === 'breadcrumb',
        );
      }
      return result;
    };
    return walk(config);
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
