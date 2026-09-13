import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pagePath = join(import.meta.dir, '../services/sms-marketing/pages/sms-campaign-detail.yaml');

describe('SMS Marketing transition reload guard', () => {
  test('keeps lifecycle reload actions bounded and error-visible', () => {
    const page = Bun.YAML.parse(readFileSync(pagePath, 'utf8')) as any;
    const actions = new Map((page.actions || []).map((action: any) => [action.id, action]));

    for (const id of ['send_sms_campaign_reload', 'schedule_sms_campaign_reload', 'cancel_sms_campaign_reload', 'complete_sms_campaign_reload']) {
      const script = String(actions.get(id)?.script || '');
      expect(script, id).toContain("await request('/api/mutate'");
      expect(script, id).toContain('signal: controller.signal');
      expect(script, id).toContain('setTimeout(() => controller.abort(), 10000)');
      expect(script, id).toContain('if (error?.name === \'AbortError\') throw new Error(');
      expect(script, id).toContain('window.location.reload()');
      expect(script, id).toContain('clearTimeout(timeout)');
    }
  });
});
