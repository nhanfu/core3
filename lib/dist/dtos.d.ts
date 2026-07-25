/**
 * Query and mutation DTOs — mirrors the core2 SqlViewModel / PatchVM pattern.
 * Used by the client to communicate with the API.
 */
export declare function createQuery({ sourceId, action, params, select, where, orderBy, groupBy, skip, top, metaConn, dataConn, }?: {
    action?: string;
    dataConn?: any;
    groupBy?: any[];
    metaConn?: any;
    orderBy?: any[];
    params?: {};
    select?: any[];
    skip?: number;
    top?: number;
    where?: {};
}): {
    sourceId: any;
    action: string;
    params: {};
    select: any[];
    where: {};
    orderBy: any[];
    groupBy: any[];
    skip: number;
    top: number;
    metaConn: any;
    dataConn: any;
};
export declare function createPatch({ table, changes, action, id }?: {
    action?: string;
    changes?: any[];
    id?: any;
}): {
    table: any;
    changes: any[];
    action: string;
    id: any;
};
