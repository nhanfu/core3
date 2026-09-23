/** Register once in each browser/worker; authorization state stays per model. */
export function registerWorkbookFunctions(engine: any) {
  engine.addFunction('CORE3.VALUE', {
    description: 'Read a field from a Core3 datasource using your account permissions.',
    args: [
      engine.helpers.arg('source (string)', 'YAML datasource key.'),
      engine.helpers.arg('field (string)', 'Declared datasource field.'),
      engine.helpers.arg('row (number)', 'Record position, starting at 1.'),
      engine.helpers.arg('filters (string)', 'JSON object containing datasource filters.'),
    ],
    isExported: false,
    compute: function(this: any, source: any, field: any, row: any, filters: any) {
      if (!this.core3Data) return new engine.EvaluationError('Core3 data is unavailable in this context', engine.CellErrorType.NotAvailable);
      try {
        const cellId = this.__originCellPosition ? this.getters.getCell(this.__originCellPosition)?.id : undefined;
        const result = this.core3Data.read(source.value, field.value, row.value, filters.value, cellId);
        return result.error ? new engine.EvaluationError(result.error, engine.CellErrorType.NotAvailable) : result.value;
      } catch (error: any) { return new engine.EvaluationError(error.message, engine.CellErrorType.NotAvailable); }
    },
  });
}
