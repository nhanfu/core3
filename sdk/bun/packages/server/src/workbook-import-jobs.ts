import { WorkbookFileJobs, type WorkbookFileJobPolicy, type ExecuteWorkbookJob } from './workbook-file-jobs';

export type WorkbookImportJobPolicy = WorkbookFileJobPolicy;

export class WorkbookImportJobs extends WorkbookFileJobs {
  constructor(policy: WorkbookImportJobPolicy, execute: ExecuteWorkbookJob, convert: (bytes: Uint8Array) => Promise<{ workbook_snapshot: string; warnings: string[] }>, interrupt?: () => void) {
    super(policy, execute, 'import_job', async job => {
      const result = await convert(Buffer.from(job.input_base64, 'base64'));
      return { workbook_snapshot: result.workbook_snapshot, warnings: JSON.stringify(result.warnings) };
    }, interrupt);
  }
}
