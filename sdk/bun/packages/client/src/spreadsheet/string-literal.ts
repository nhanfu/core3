/** The engine uses backslash quoting, while XLSX uses doubled quotes. Character
 * expressions avoid ambiguity, including strings ending in a backslash. */
export function workbookStringLiteral(value: string): string {
  return value.split(/(["\\\t\r\n])/).map(part => /^["\\\t\r\n]$/.test(part) ? `CHAR(${part.charCodeAt(0)})` : `"${part}"`).join('&');
}
