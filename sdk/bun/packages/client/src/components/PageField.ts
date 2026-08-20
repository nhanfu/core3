import { BaseComponent } from '@core3/client/components/BaseComponent';

export type PageFieldState = {
  field: any;
  fieldId: string;
  initialValue: unknown;
  dataMap: Record<string, any>;
};

export abstract class PageField extends BaseComponent {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null;
  usesAsyncSelect = false;

  constructor(id: string, state: PageFieldState) {
    super(id, state);
  }

  protected sourceOptions() {
    const { field, dataMap } = this.state as PageFieldState;
    const rows = field.options_source && Array.isArray(dataMap[field.options_source]?.data)
      ? dataMap[field.options_source].data
      : [];
    if (field.options_source) {
      return rows.map((option: any) => ({
        value: String(option.value ?? option.id ?? option.code ?? ''),
        label: String(option.label ?? option.name ?? option.value ?? option.id ?? option.code ?? ''),
      }));
    }
    return (field.options || []).map((option: any) => {
      if (option && typeof option === 'object') {
        const value = option.value ?? option.id ?? option.code;
        return { value: String(value ?? ''), label: String(option.label ?? option.name ?? value ?? '') };
      }
      return { value: String(option ?? ''), label: String(option ?? '') };
    });
  }
}
