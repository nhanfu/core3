/**
 * Query and mutation DTOs — mirrors the core2 SqlViewModel / PatchVM pattern.
 * Used by the client to communicate with the API.
 */

export function createQuery({
  sourceId,
  action = 'query',
  params = {},
  select = [],
  where = {},
  orderBy = [],
  groupBy = [],
  skip = 0,
  top = 25,
  metaConn = null,
  dataConn = null,
} = {}) {
  return { sourceId, action, params, select, where, orderBy, groupBy, skip, top, metaConn, dataConn };
}

export function createPatch({ table, changes = [], action = 'update', id = null } = {}) {
  return { table, changes, action, id };
}
