/** One paste produces one undoable revision containing formulas, never fetched rows. */
export function insertLinkedList(model: any, cells: string[][]) {
  if (!cells.length || !cells[0].length) throw new Error('No linked records to insert');
  const { sheetId, col, row } = model.getters.getActivePosition();
  for (let y = 0; y < cells.length; y++) for (let x = 0; x < cells[y].length; x++) {
    if (model.getters.getCell({ sheetId, col: col + x, row: row + y })?.content) throw new Error('Choose an empty range for the linked list');
  }
  if (cells.some(values => values.some(value => /[\t\r\n]/.test(value)))) throw new Error('Linked formulas contain an unsupported control character');
  const text = cells.map(values => values.join('\t')).join('\n');
  const result = model.dispatch('PASTE_FROM_OS_CLIPBOARD', {
    target: [{ left: col, right: col, top: row, bottom: row }], clipboardContent: { text },
  });
  if (!result.isSuccessful) throw new Error('The selected range cannot accept the linked list');
}
