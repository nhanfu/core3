/**
 * Query and mutation DTOs — mirrors the core2 SqlViewModel / PatchVM pattern.
 * Used by the client to communicate with the API.
 */

export function createQuery(options: any = {}) {
  const {
    sourceId,
    action = 'query',
    params = {},
    select = [],
    where = {},
    orderBy = [],
    groupBy = [],
    skip = 0,
    top = 25,
    facetField = null,
    metaConn = null,
    dataConn = null,
  } = options;
  return { sourceId, action, params, select, where, orderBy, groupBy, skip, top, facetField, metaConn, dataConn };
}

export function createPatch(options: any = {}) {
  const { table, changes = [], action = 'update', id = null } = options;
  return { table, changes, action, id };
}
