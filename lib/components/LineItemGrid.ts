import { DataGrid } from './DataGrid.ts';

/**
 * Semantic document-line grid. It intentionally inherits DataGrid behavior so
 * sorting, selection, pagination, and action transport stay consistent.
 */
export class LineItemGrid extends DataGrid {}
