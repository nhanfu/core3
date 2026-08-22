const [, , taskId, action, rawValues = '{}'] = process.argv;
const baseUrl = process.env.CORE3_TASK_API_URL || 'http://127.0.0.1:3001';
const token = process.env.CORE3_TASK_TOKEN || '';
if (!taskId || !action) {
  console.error('Usage: bun sample/task-action.ts <task_id> <action> <json-values>');
  process.exit(2);
}
let values: unknown;
try { values = JSON.parse(rawValues); } catch { console.error('The third argument must be valid JSON'); process.exit(2); }
const response = await fetch(`${baseUrl}/api/tasks/${encodeURIComponent(taskId)}/action`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action, values }),
});
const text = await response.text();
console.log(text);
if (!response.ok) process.exit(1);
