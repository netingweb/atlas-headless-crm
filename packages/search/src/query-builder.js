"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTypesenseQuery = buildTypesenseQuery;
function buildTypesenseQuery(ctx, query) {
    const filterParts = [`tenant_id:=${ctx.tenant_id}`, `unit_id:=${ctx.unit_id}`];
    if (query.filters) {
        for (const [key, value] of Object.entries(query.filters)) {
            if (value !== undefined && value !== null) {
                filterParts.push(`${key}:=${value}`);
            }
        }
    }
    return {
        q: query.q,
        query_by: '*',
        filter_by: filterParts.join(' && '),
        facet_by: query.facets?.join(','),
        per_page: query.per_page || 10,
        page: query.page || 1,
    };
}
//# sourceMappingURL=query-builder.js.map