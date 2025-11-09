import { Injectable } from '@nestjs/common';
import type { TenantContext } from '@crm-atlas/core';
import {
  search,
  buildTypesenseQuery,
  ensureCollection,
  searchQdrant,
  ensureQdrantCollection,
} from '@crm-atlas/search';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb } from '@crm-atlas/db';
import { createEmbeddingsProvider, getProviderConfig } from '@crm-atlas/embeddings';
import { getEmbeddableFields } from '@crm-atlas/utils';
import type { TextSearchQuery } from '@crm-atlas/search';

@Injectable()
export class SearchService {
  private readonly configLoader = new MongoConfigLoader(getDb());

  async textSearch(
    ctx: TenantContext,
    query: TextSearchQuery
  ): Promise<{ hits: unknown[]; found: number; page: number }> {
    if (query.entity) {
      const entityDef = await this.configLoader.getEntity(ctx, query.entity);
      if (entityDef) {
        await ensureCollection(ctx, query.entity, entityDef);
      }
    }

    const searchOptions = buildTypesenseQuery(ctx, query);
    return search(ctx, query.entity || '*', searchOptions);
  }

  async semanticSearch(
    ctx: TenantContext,
    entity: string,
    query: string,
    limit = 10
  ): Promise<Array<{ id: string; score: number; payload: unknown }>> {
    const entityDef = await this.configLoader.getEntity(ctx, entity);
    if (!entityDef) {
      throw new Error(`Entity ${entity} not found`);
    }

    const embeddableFields = getEmbeddableFields(entityDef);
    if (embeddableFields.length === 0) {
      throw new Error(`Entity ${entity} has no embeddable fields`);
    }

    const tenantConfig = await this.configLoader.getTenant(ctx.tenant_id);
    const globalConfig = getProviderConfig();
    const provider = createEmbeddingsProvider(globalConfig, tenantConfig?.embeddingsProvider);

    const [queryVector] = await provider.embedTexts([query]);

    await ensureQdrantCollection(ctx.tenant_id, entity, queryVector.length);

    const results = await searchQdrant(ctx.tenant_id, entity, {
      vector: queryVector,
      limit,
      filter: {
        must: [
          { key: 'tenant_id', match: { value: ctx.tenant_id } },
          { key: 'unit_id', match: { value: ctx.unit_id } },
        ],
      },
    });

    return results.map((r) => ({
      id: String(r.id),
      score: r.score,
      payload: r.payload,
    }));
  }

  /**
   * Hybrid search: combines semantic and full-text search with weighted scoring
   */
  async hybridSearch(
    ctx: TenantContext,
    entity: string,
    query: string,
    semanticWeight = 0.7,
    textWeight = 0.3,
    limit = 10
  ): Promise<{
    results: Array<{
      id: string;
      score: number;
      semantic_score: number;
      text_score: number;
      document: Record<string, unknown>;
    }>;
    total: number;
  }> {
    const entityDef = await this.configLoader.getEntity(ctx, entity);
    if (!entityDef) {
      throw new Error(`Entity ${entity} not found`);
    }

    // Normalize weights
    const totalWeight = semanticWeight + textWeight;
    const normalizedSemanticWeight = semanticWeight / totalWeight;
    const normalizedTextWeight = textWeight / totalWeight;

    // Perform semantic search
    let semanticResults: Array<{ id: string; score: number; payload: Record<string, unknown> }> =
      [];
    try {
      const embeddableFields = getEmbeddableFields(entityDef);
      if (embeddableFields.length > 0) {
        const semanticSearchResults = await this.semanticSearch(ctx, entity, query, limit * 2);
        semanticResults = semanticSearchResults.map((r) => ({
          id: r.id,
          score: r.score,
          payload: r.payload as Record<string, unknown>,
        }));
      }
    } catch (error) {
      console.warn(`Semantic search failed for ${entity}:`, error);
    }

    // Perform full-text search
    let textResults: { hits: unknown[]; found: number } = { hits: [], found: 0 };
    try {
      textResults = await this.textSearch(ctx, {
        q: query,
        entity,
        per_page: limit * 2,
        page: 1,
      });
    } catch (error) {
      console.warn(`Text search failed for ${entity}:`, error);
    }

    // Combine results with scoring
    const combinedScores = new Map<
      string,
      { semantic_score: number; text_score: number; document: Record<string, unknown> }
    >();

    // Add semantic results
    for (const result of semanticResults) {
      const doc = result.payload as Record<string, unknown>;
      combinedScores.set(result.id, {
        semantic_score: result.score,
        text_score: 0,
        document: doc,
      });
    }

    // Add/update with text results
    for (const hit of textResults.hits) {
      const hitDoc = hit as Record<string, unknown>;
      const id = String(hitDoc.id || hitDoc._id);
      const existing = combinedScores.get(id);

      if (existing) {
        // Both searches found it - use text relevance (simplified: assume high relevance)
        existing.text_score = 0.8;
      } else {
        // Only text search found it
        combinedScores.set(id, {
          semantic_score: 0,
          text_score: 0.8,
          document: hitDoc,
        });
      }
    }

    // Calculate combined scores and sort
    const results = Array.from(combinedScores.entries())
      .map(([id, data]) => ({
        id,
        score:
          data.semantic_score * normalizedSemanticWeight + data.text_score * normalizedTextWeight,
        semantic_score: data.semantic_score,
        text_score: data.text_score,
        document: data.document,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      results,
      total: results.length,
    };
  }

  /**
   * Global search across all entities
   */
  async globalSearch(
    ctx: TenantContext,
    query: string,
    limit = 10
  ): Promise<Array<{ entity: string; items: unknown[] }>> {
    const entities = await this.configLoader.getEntities(ctx);
    const results: Array<{ entity: string; items: unknown[] }> = [];

    // Search each entity type
    for (const entityDef of entities) {
      try {
        const searchResults = await this.textSearch(ctx, {
          q: query,
          entity: entityDef.name,
          per_page: limit,
          page: 1,
        });

        if (searchResults.hits && searchResults.hits.length > 0) {
          // Map hits to ensure consistent structure
          const mappedItems = searchResults.hits.map(
            (hit: {
              document?: { id?: string; _id?: string; [key: string]: unknown };
              id?: string;
              _id?: string;
              [key: string]: unknown;
            }) => {
              // Typesense returns documents directly or wrapped in document property
              if (hit.document) {
                const doc = hit.document as { id?: string; _id?: string; [key: string]: unknown };
                return { ...doc, _id: doc.id || doc._id };
              }
              return { ...hit, _id: hit.id || hit._id };
            }
          );

          results.push({
            entity: entityDef.name,
            items: mappedItems,
          });
        }
      } catch (error) {
        console.warn(`Global search failed for entity ${entityDef.name}:`, error);
      }
    }

    return results;
  }
}
