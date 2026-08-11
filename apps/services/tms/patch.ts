import type { TmsRouteContext } from './api-route-context.ts';

export async function handlePatchRoutes(ctx: TmsRouteContext): Promise<Response | null> {
  const {
    req, url, pathname, method, repository, authProvider, SOURCES, PAGES, CATALOGS,
    UPLOAD_ROOT, reloadPages, authUser, activityActor, FINANCIAL_WORKFLOW_SCOPES,
    NAMED_ACTIONS, TABLES, requirePerm, permissionForEndpoint, permissionForAction,
    recordInCurrentBranch, branchForScopedResource, crmEntityInScope,
    configuredCurrencyRates, json, apiError, pageCacheHeaders, prefetchedPageConfig,
  } = ctx;

  // ── POST /api/patch ───────────────────────────────────────────────────────
  if (pathname === '/api/patch' && method === 'POST') {
    const body = await req.json() as any;
    let { table, action, id, changes = [], scope } = body;

    const tbl = TABLES[table as keyof typeof TABLES];
    if (!tbl) return apiError(404, `Unknown table: ${table}`);
    requirePerm(tbl.permission);

    const scopedBranch = String(authUser.view_scope || 'all') !== 'all';
    const currentBranchId = String(authUser.branch_id || '');
    const rejectOutOfScope = () => apiError(403, 'Record is outside the current view scope');
    const branchForRow = async (resourceTable: string, resourceId: string) => {
      if (resourceTable === 'trucks' || resourceTable === 'departments') {
        const [row] = await repository.query(`SELECT branch_id FROM ${resourceTable} WHERE id = ?`, [resourceId]);
        return row?.branch_id ? String(row.branch_id) : null;
      }
      if (resourceTable === 'users' || resourceTable === 'employees' || resourceTable === 'employment_contracts' || resourceTable === 'timesheets' || resourceTable === 'payrolls') {
        return branchForScopedResource(resourceTable, resourceId);
      }
      if (resourceTable === 'accounting_entries' || resourceTable === 'orders' || resourceTable === 'quotes' || resourceTable === 'locations' || resourceTable === 'containers') return branchForScopedResource(resourceTable, resourceId);
      if (resourceTable === 'drivers') {
        const [row] = await repository.query(
          'SELECT t.branch_id FROM drivers d LEFT JOIN trucks t ON t.id = d.assigned_truck_id WHERE d.id = ?',
          [resourceId],
        );
        return row?.branch_id ? String(row.branch_id) : null;
      }
      if (resourceTable === 'trips' || resourceTable === 'maintenance') {
        const [row] = await repository.query(
          `SELECT COALESCE(r.branch_id, t.branch_id) AS branch_id FROM ${resourceTable} r LEFT JOIN trucks t ON t.id = r.truck_id WHERE r.id = ?`,
          [resourceId],
        );
        return row?.branch_id ? String(row.branch_id) : null;
      }
      if (resourceTable === 'branches') return resourceId;
      if (resourceTable === 'teams') {
        const [row] = await repository.query(
          'SELECT d.branch_id FROM teams t LEFT JOIN departments d ON d.id = t.department_id WHERE t.id = ?',
          [resourceId],
        );
        return row?.branch_id ? String(row.branch_id) : null;
      }
      return null;
    };
    const departmentBranch = async (departmentId: unknown) => {
      if (!departmentId) return null;
      const [row] = await repository.query('SELECT branch_id FROM departments WHERE id = ?', [String(departmentId)]);
      return row?.branch_id ? String(row.branch_id) : null;
    };
    if (table === 'trips' && action === 'insert' && !changes.some((change: any) => change.field === 'branch_id')) {
      const truckId = changes.find((change: any) => change.field === 'truck_id')?.value;
      const truckBranch = truckId ? await branchForRow('trucks', String(truckId)) : null;
      if (truckBranch) changes = [...changes, { field: 'branch_id', value: truckBranch }];
    }
    if (table === 'customers' || table === 'partners') {
      const kind = table === 'customers' ? 'customer' : 'partner';

      if (action === 'insert') {
        const ownerChange = changes.find((change: any) => change.field === 'owner_name');
        if (scopedBranch && ownerChange && String(ownerChange.value || '') !== activityActor.name) return rejectOutOfScope();
        if (scopedBranch && !ownerChange) changes = [...changes, { field: 'owner_name', value: activityActor.name }];
      } else if (id && !(await crmEntityInScope(kind, String(id)))) {
        return rejectOutOfScope();
      }
    }

    if (scopedBranch) {
      if (!currentBranchId) return rejectOutOfScope();
      if (action === 'insert') {
        if (table === 'branches') return rejectOutOfScope();
        if (table === 'trucks' || table === 'departments') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          if (table === 'departments') {
            const parentId = changes.find((change: any) => change.field === 'parent_id')?.value;
            const parentBranch = parentId ? await departmentBranch(parentId) : currentBranchId;
            if (!parentBranch || parentBranch !== currentBranchId) return rejectOutOfScope();
          }
          if (!requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
        if (table === 'teams') {
          const branchId = await departmentBranch(changes.find((change: any) => change.field === 'department_id')?.value);
          if (branchId && branchId !== currentBranchId) return rejectOutOfScope();
        }
        if (table === 'drivers' || table === 'trips' || table === 'maintenance') {
          const truckId = changes.find((change: any) => change.field === (table === 'drivers' ? 'assigned_truck_id' : 'truck_id'))?.value;
          const requestedBranch = table === 'trips' ? changes.find((change: any) => change.field === 'branch_id')?.value : null;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          const branchId = truckId ? await branchForRow('trucks', String(truckId)) : (requestedBranch ? String(requestedBranch) : currentBranchId);
          if (!branchId || branchId !== currentBranchId) return rejectOutOfScope();
          if (table === 'trips' && !requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
        if (table === 'users') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          const departmentId = changes.find((change: any) => change.field === 'department_id')?.value;
          const departmentScope = departmentId ? await departmentBranch(departmentId) : currentBranchId;
          if (!departmentScope || departmentScope !== currentBranchId) return rejectOutOfScope();
          if (!requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
        if (table === 'employees') {
          const department = changes.find((change: any) => change.field === 'department')?.value;
          const [row] = department ? await repository.query('SELECT branch_id FROM departments WHERE name ILIKE ? LIMIT 1', [`%${String(department)}%`]) : [];
          if (!row?.branch_id || String(row.branch_id) !== currentBranchId) return rejectOutOfScope();
        }
        if (table === 'employment_contracts' || table === 'timesheets' || table === 'payrolls') {
          const employeeId = changes.find((change: any) => change.field === 'employee_id')?.value;
          const employeeBranch = employeeId ? await branchForScopedResource('employees', String(employeeId)) : null;
          if (!employeeBranch || employeeBranch !== currentBranchId) return rejectOutOfScope();
        }
        if (table === 'accounting_entries') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          if (!requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
        if (table === 'quotes') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          if (!requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
        if (table === 'locations' || table === 'containers') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
          if (table === 'containers') {
            const locationId = changes.find((change: any) => change.field === 'location_id')?.value;
            const locationBranch = locationId ? await branchForRow('locations', String(locationId)) : currentBranchId;
            if (!locationBranch || locationBranch !== currentBranchId) return rejectOutOfScope();
          }
          if (!requestedBranch) changes = [...changes, { field: 'branch_id', value: currentBranchId }];
        }
      } else if (id) {
        const rowBranch = await branchForRow(table, String(id));
        if ((table === 'drivers' || table === 'trips' || table === 'maintenance' || table === 'users' || table === 'employees' || table === 'employment_contracts' || table === 'timesheets' || table === 'payrolls' || table === 'accounting_entries' || table === 'quotes' || table === 'locations' || table === 'containers') && !rowBranch) return rejectOutOfScope();
        if (rowBranch && rowBranch !== currentBranchId) return rejectOutOfScope();
        if (table === 'trucks' || table === 'departments') {
          const requestedBranch = changes.find((change: any) => change.field === 'branch_id')?.value;
          if (requestedBranch && String(requestedBranch) !== currentBranchId) return rejectOutOfScope();
        }
        if (table === 'departments' && action === 'update') {
          const parentChange = changes.find((change: any) => change.field === 'parent_id');
          if (parentChange) {
            const parentBranch = parentChange.value ? await departmentBranch(parentChange.value) : currentBranchId;
            if (!parentBranch || parentBranch !== currentBranchId) return rejectOutOfScope();
          }
        }
        if (table === 'teams' && action === 'update') {
          const departmentId = changes.find((change: any) => change.field === 'department_id')?.value;
          const nextBranch = await departmentBranch(departmentId);
          if (nextBranch && nextBranch !== currentBranchId) return rejectOutOfScope();
        }
        if ((table === 'drivers' || table === 'trips' || table === 'maintenance') && action === 'update') {
          const truckField = table === 'drivers' ? 'assigned_truck_id' : 'truck_id';
          const truckChange = changes.find((change: any) => change.field === truckField);
          if (truckChange && truckChange.value) {
            const nextBranch = await branchForRow('trucks', String(truckChange.value || ''));
            if (!nextBranch || nextBranch !== currentBranchId) return rejectOutOfScope();
          }
          if (table === 'trips') {
            const branchChange = changes.find((change: any) => change.field === 'branch_id');
            if (branchChange && String(branchChange.value || '') !== currentBranchId) return rejectOutOfScope();
          }
        }
        if (table === 'users' && action === 'update') {
          const branchChange = changes.find((change: any) => change.field === 'branch_id');
          if (branchChange && String(branchChange.value || '') !== currentBranchId) return rejectOutOfScope();
          const departmentChange = changes.find((change: any) => change.field === 'department_id');
          if (departmentChange) {
            const departmentScope = await departmentBranch(departmentChange.value);
            if (!departmentScope || departmentScope !== currentBranchId) return rejectOutOfScope();
          }
        }
        if (table === 'employees' && action === 'update') {
          const departmentChange = changes.find((change: any) => change.field === 'department');
          if (departmentChange) {
            const [nextDepartment] = await repository.query('SELECT branch_id FROM departments WHERE name ILIKE ? LIMIT 1', [`%${String(departmentChange.value || '')}%`]);
            if (!nextDepartment?.branch_id || String(nextDepartment.branch_id) !== currentBranchId) return rejectOutOfScope();
          }
        }
        if ((table === 'employment_contracts' || table === 'timesheets' || table === 'payrolls') && action === 'update') {
          const employeeChange = changes.find((change: any) => change.field === 'employee_id');
          if (employeeChange) {
            const nextBranch = await branchForScopedResource('employees', String(employeeChange.value || ''));
            if (!nextBranch || nextBranch !== currentBranchId) return rejectOutOfScope();
          }
        }
        if (table === 'accounting_entries' && action === 'update') {
          const branchChange = changes.find((change: any) => change.field === 'branch_id');
          if (branchChange && String(branchChange.value || '') !== currentBranchId) return rejectOutOfScope();
        }
        if (table === 'quotes' && action === 'update') {
          const branchChange = changes.find((change: any) => change.field === 'branch_id');
          if (branchChange && String(branchChange.value || '') !== currentBranchId) return rejectOutOfScope();
        }
        if ((table === 'locations' || table === 'containers') && action === 'update') {
          const branchChange = changes.find((change: any) => change.field === 'branch_id');
          if (branchChange && String(branchChange.value || '') !== currentBranchId) return rejectOutOfScope();
          if (table === 'containers') {
            const locationChange = changes.find((change: any) => change.field === 'location_id');
            if (locationChange) {
              const nextBranch = await branchForRow('locations', String(locationChange.value || ''));
              if (!nextBranch || nextBranch !== currentBranchId) return rejectOutOfScope();
            }
          }
        }
      }
    }

    if ('fields' in tbl && changes.some((change: any) => !tbl.fields.includes(change.field))) {
      return apiError(400, 'Invalid field for this resource');
    }
    const changedValue = (field: string) => changes.find((change: any) => change.field === field)?.value;
    const hasChanged = (field: string) => changes.some((change: any) => change.field === field);
    const validateCatalogValue = (field: string, validate: (value: unknown) => boolean, message: string) => {
      if (hasChanged(field) && !validate(changedValue(field))) return message;
      return null;
    };
    if (table === 'master_data' || table === 'system_configs') {
      if (action === 'insert' && (!String(changedValue('code') || '').trim() || !String(changedValue('name') || '').trim())) {
        return apiError(400, 'code and name are required');
      }
      for (const [field, validate, message] of [
        ['code', (value: unknown) => Boolean(String(value || '').trim()), 'code is required'],
        ['name', (value: unknown) => Boolean(String(value || '').trim()), 'name is required'],
        ['status', (value: unknown) => ['Active', 'Inactive'].includes(String(value)), 'status must be Active or Inactive'],
        ['sort_order', (value: unknown) => Number.isInteger(Number(value)) && Number(value) >= 0, 'sort_order must be a non-negative integer'],
      ] as const) {
        const error = validateCatalogValue(field, validate, message);
        if (error) return apiError(400, error);
      }
    }
    if (table === 'master_data') {
      const error = validateCatalogValue('decimals', (value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 6, 'decimals must be an integer from 0 to 6');
      if (error) return apiError(400, error);
    }
    if (table === 'system_configs' && scope === 'code_rule') {
      for (const [field, validate, message] of [
        ['prefix', (value: unknown) => Boolean(String(value || '').trim()), 'prefix is required'],
        ['sequence_width', (value: unknown) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 12, 'sequence_width must be an integer from 1 to 12'],
        ['next_sequence', (value: unknown) => Number.isInteger(Number(value)) && Number(value) >= 1, 'next_sequence must be a positive integer'],
        ['reset_cadence', (value: unknown) => ['never', 'monthly', 'yearly'].includes(String(value)), 'reset_cadence is invalid'],
      ] as const) {
        const error = validateCatalogValue(field, validate, message);
        if (error) return apiError(400, error);
      }
    }
    if (table === 'roles' && changes.some((change: any) => change.field === 'view_scope' && !['all', 'branch', 'own'].includes(String(change.value)))) {
      return apiError(400, 'Invalid role view scope');
    }
    if (table === 'areas' && changes.some((change: any) => change.field === 'parent_id')) {
      const parentId = changes.find((change: any) => change.field === 'parent_id')?.value;
      if (parentId && String(parentId) === String(id)) return apiError(400, 'Area cannot be its own parent');
      if (parentId) {
        const [parent] = await repository.query('SELECT id FROM areas WHERE id = ?', [parentId]);
        if (!parent) return apiError(400, 'Parent area not found');
        let cursor = String(parentId);
        for (let depth = 0; depth < 100 && cursor; depth++) {
          if (cursor === String(id)) return apiError(400, 'Area hierarchy cycle detected');

          const [ancestor] = await repository.query('SELECT parent_id FROM areas WHERE id = ?', [cursor]);
          cursor = ancestor?.parent_id ? String(ancestor.parent_id) : '';
        }
      }
    }
    if (table === 'departments' && changes.some((change: any) => change.field === 'parent_id')) {
      const parentId = changes.find((change: any) => change.field === 'parent_id')?.value;
      if (parentId && String(parentId) === String(id)) return apiError(400, 'Department cannot be its own parent');
      if (parentId) {
        const [parent] = await repository.query('SELECT id FROM departments WHERE id = ?', [parentId]);
        if (!parent) return apiError(400, 'Parent department not found');
        let cursor = String(parentId);
        for (let depth = 0; depth < 100 && cursor; depth++) {
          if (cursor === String(id)) return apiError(400, 'Department hierarchy cycle detected');
          const [ancestor] = await repository.query('SELECT parent_id FROM departments WHERE id = ?', [cursor]);
          cursor = ancestor?.parent_id ? String(ancestor.parent_id) : '';
        }
      }
    }
    if (table === 'accounting_entries' && changes.some((change: any) => change.field === 'linked_advance_id')) {
      const linkedId = changes.find((change: any) => change.field === 'linked_advance_id')?.value;
      if (linkedId) {
        const [advance] = await repository.query("SELECT id FROM accounting_entries WHERE id = ? AND kind = 'advance'", [linkedId]);
        if (!advance) return apiError(400, 'Linked advance not found');
      }
    }
    if (table === 'accounting_entries' && scope === 'ledger_account' && changes.some((change: any) => change.field === 'parent_id')) {
      const parentId = changes.find((change: any) => change.field === 'parent_id')?.value;
      if (parentId && String(parentId) === String(id)) return apiError(400, 'Ledger account cannot be its own parent');
      if (parentId) {
        const [parent] = await repository.query("SELECT id FROM accounting_entries WHERE id = ? AND kind = 'ledger_account'", [parentId]);
        if (!parent) return apiError(400, 'Parent ledger account not found');
        let cursor = String(parentId);
        for (let depth = 0; depth < 100 && cursor; depth++) {
          if (cursor === String(id)) return apiError(400, 'Ledger account hierarchy cycle detected');
          const [ancestor] = await repository.query("SELECT parent_id FROM accounting_entries WHERE id = ? AND kind = 'ledger_account'", [cursor]);
          cursor = ancestor?.parent_id ? String(ancestor.parent_id) : '';
        }
      }
    }
    if ('scopes' in tbl && !tbl.scopes.includes(scope)) {
      return apiError(400, 'Invalid resource scope');
    }
    if (
      table === 'accounting_entries'
      && FINANCIAL_WORKFLOW_SCOPES.has(scope)
      && changes.some((change: any) => change.field === 'status' || change.field === 'amount')
    ) {
      return apiError(400, 'Financial document status and amount require named actions');
    }
    if (
      (table === 'quotes' || table === 'payrolls')
      && changes.some((change: any) => change.field === 'status')
    ) {
      return apiError(400, `${table === 'quotes' ? 'Quote' : 'Payroll'} status requires a named action`);
    }

    if ('scopes' in tbl && action !== 'insert') {
      const existing = await repository.query(`SELECT kind FROM ${table} WHERE id = ?`, [id]);
      if (!existing[0] || existing[0].kind !== scope) return apiError(404, 'Resource not found');
    }
    if (
      table === 'accounting_entries'
      && FINANCIAL_WORKFLOW_SCOPES.has(scope)
      && (action === 'update' || action === 'delete')
    ) {
      const [document] = await repository.query(
        'SELECT status FROM accounting_entries WHERE id = ? AND kind = ?',
        [id, scope],
      );
      if (!document) return apiError(404, 'Financial document not found');
      if (document.status !== 'Draft') {
        return apiError(
          409,
          `Financial document cannot be ${action === 'update' ? 'edited' : 'deleted'} while ${document.status}`,
        );
      }
    }
    if (
      (table === 'quotes' || table === 'payrolls')
      && (action === 'update' || action === 'delete')
    ) {
      const [record] = await repository.query(
        `SELECT status FROM ${table} WHERE id = ?`,
        [id],
      );
      if (!record) return apiError(404, `${table === 'quotes' ? 'Quote' : 'Payroll'} not found`);
      if (record.status !== 'Draft') {
        return apiError(
          409,
          `${table === 'quotes' ? 'Quote' : 'Payroll'} cannot be ${action === 'update' ? 'edited' : 'deleted'} while ${record.status}`,
        );
      }
    }

    // ── insert ──────────────────────────────────────────────────────────────
    if (action === 'insert') {
      if (table === 'users') {
        const created = await repository.createUser(changes);
        await repository.recordActivity({
          actorId: activityActor.id,
          actorName: activityActor.name,
          action: 'create',
          resource: table,
          resourceId: created?.id,
          detail: `Created ${table} record`,
        });
        return json(created, 201);
      }

      // Generic insert
      if (changes.length === 0) return apiError(400, 'No fields to insert');
      const scopedChanges = 'scopes' in tbl
        ? [{ field: 'kind', value: scope }, ...changes]
        : changes;
      const created = await repository.createRecord(table, scopedChanges);
      await repository.recordActivity({
        actorId: activityActor.id,
        actorName: activityActor.name,
        action: 'create',
        resource: table,
        resourceId: created?.id,
        detail: `Created ${scope || table} record`,
      });
      return json(created, 201);
    }

    // ── update ──────────────────────────────────────────────────────────────
    if (action === 'update') {
      if (!id) return apiError(400, 'id required for update');

      if (table === 'users') {
        const updated = await repository.updateUser(id, changes);
        await repository.recordActivity({
          actorId: activityActor.id,
          actorName: activityActor.name,
          action: 'update',
          resource: table,
          resourceId: String(id),
          detail: `Updated fields: ${changes.map((change: any) => change.field).join(', ')}`,
        });
        return json(updated);
      }

      // Generic update
      if (changes.length === 0) return apiError(400, 'No fields to update');
      const updated = await repository.updateRecord(table, id, changes, tbl.timestamps);
      if (!updated) return apiError(404, 'Resource not found');
      await repository.recordActivity({
        actorId: activityActor.id,
        actorName: activityActor.name,
        action: 'update',
        resource: table,
        resourceId: String(id),
        detail: `Updated fields: ${changes.map((change: any) => change.field).join(', ')}`,
      });
      return json(updated);
    }

    // ── delete ──────────────────────────────────────────────────────────────
    if (action === 'delete') {
      if (!id) return apiError(400, 'id required for delete');
      if (!('scopes' in tbl) && table !== 'orders') {
        const existing = await repository.query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
        if (!existing[0]) return apiError(404, 'Resource not found');
      }
      if (table === 'users') {
        await repository.deleteUserRoles(id);
      }
      await repository.deleteRecord(table, id);
      await repository.recordActivity({
        actorId: activityActor.id,
        actorName: activityActor.name,
        action: 'delete',
        resource: table,
        resourceId: String(id),
        detail: `Deleted ${scope || table} record`,
      });
      return json({ ok: true });
    }

    return apiError(400, `Unknown action: ${action}`);
  }


  return null;
}
