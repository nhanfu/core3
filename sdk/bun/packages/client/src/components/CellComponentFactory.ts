import { BaseComponent } from '@core3/client/components/BaseComponent';
import { TextCell } from '@core3/client/components/TextCell';
import { BadgeCell } from '@core3/client/components/BadgeCell';
import { CurrencyCell } from '@core3/client/components/CurrencyCell';
import { NumberCell } from '@core3/client/components/NumberCell';
import { DateCell } from '@core3/client/components/DateCell';
import { BooleanCell } from '@core3/client/components/BooleanCell';
import { ActionCell } from '@core3/client/components/ActionCell';
import { AvatarCell } from '@core3/client/components/AvatarCell';
import { PercentCell } from '@core3/client/components/PercentCell';

export type CellDefinition = {
  type?: string;
  field?: string;
  colorField?: string;
  currency?: string;
  format?: string;
  overdueField?: string;
  actions?: any[];
  srcField?: string;
  size?: string;
  secondary?: string;
  colors?: Record<string, string>;
};

export type CellStateOptions = {
  actionFilter?: (action: any, row: any) => boolean;
};

type CellConstructor = new (id: string, state?: any) => BaseComponent;

const CELL_COMPONENTS: Record<string, CellConstructor> = {
  TextCell,
  BadgeCell,
  CurrencyCell,
  NumberCell,
  DateCell,
  BooleanCell,
  ActionCell,
  AvatarCell,
  PercentCell,
};

export class CellComponentFactory {
  static resolve(type?: string): CellConstructor {
    return CELL_COMPONENTS[type || ''] || TextCell;
  }

  static state(def: CellDefinition, row: any, options: CellStateOptions = {}) {
    const value = row[def.field || ''];
    const stateByType: Record<string, () => any> = {
      BadgeCell: () => ({ value, color: def.colors?.[String(value)] || (def.colorField ? row[def.colorField] : null) }),
      CurrencyCell: () => ({ value, currency: def.currency || 'USD' }),
      NumberCell: () => ({ value, format: def.format || 'number' }),
      DateCell: () => ({ value, format: def.format || 'short', overdue: def.overdueField ? !!row[def.overdueField] : false }),
      BooleanCell: () => ({ value: !!value }),
      ActionCell: () => ({ actions: (def.actions || []).filter(action => !options.actionFilter || options.actionFilter(action, row)), row }),
      AvatarCell: () => ({ name: row[def.field || ''], src: def.srcField ? row[def.srcField] : null, size: def.size || 'sm' }),
      PercentCell: () => ({ value }),
    };
    return (stateByType[def.type || ''] || (() => ({ value, secondary: def.secondary ? row[def.secondary] : null })))();
  }

  static create(id: string, def: CellDefinition, row: any, options: CellStateOptions = {}) {
    const Cell = this.resolve(def.type);
    return new Cell(id, this.state(def, row, options));
  }
}
