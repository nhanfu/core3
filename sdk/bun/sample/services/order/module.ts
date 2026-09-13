import { loadYamlServiceManifest, YamlServiceModule } from '@core3/server/yaml-service';
import type { ModuleContext, ModuleLifecycle } from '@core3/server/module';
import { EcommerceSalesHandoffConsumer } from './sales-handoff-consumer';

export default class OrderModule implements ModuleLifecycle {
  readonly id = 'order';
  private delegate: YamlServiceModule | null = null;
  private consumer: EcommerceSalesHandoffConsumer | null = null;

  private getDelegate(context: ModuleContext): YamlServiceModule {
    this.delegate ??= new YamlServiceModule(loadYamlServiceManifest(context.moduleRoot));
    return this.delegate;
  }

  install(context: ModuleContext): void { this.getDelegate(context).install(context); }

  async load(context: ModuleContext): Promise<void> {
    const delegate = this.getDelegate(context);
    await delegate.load(context);
    const sales = context.resolveService<any>('yaml.service.order');
    const ecommerce = context.resolveService<any>('yaml.service.ecommerce');
    this.consumer = new EcommerceSalesHandoffConsumer(ecommerce, sales);
    if (context.env.CORE3_ECOMMERCE_SALES_HANDOFF_CONSUMER !== 'false') this.consumer.start();
    const api = delegate.getRuntimeContext()?.api;
    context.registerApi(async (request, url, server) => api ? (await api(request, url, server)) || null : null);
  }

  async unload(context: ModuleContext): Promise<void> {
    this.consumer?.stop();
    this.consumer = null;
    await this.delegate?.unload(context);
    this.delegate = null;
  }

  uninstall(context: ModuleContext): void { this.delegate?.uninstall(context); }
}
