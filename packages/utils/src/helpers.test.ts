import { collectionName, qdrantCollectionName, getEmbeddableFields, concatFields } from './helpers';
import type { EntityDefinition } from '@crm-atlas/types';

describe('helpers', () => {
  describe('collectionName', () => {
    it('should generate correct collection name', () => {
      expect(collectionName('demo', 'sales', 'contact')).toBe('demo_sales_contact');
    });

    it('should handle special characters', () => {
      expect(collectionName('demo-tenant', 'sales-unit', 'contact_name')).toBe(
        'demo_tenant_sales_unit_contact_name'
      );
    });

    it('should convert to lowercase', () => {
      expect(collectionName('DEMO', 'SALES', 'CONTACT')).toBe('demo_sales_contact');
    });
  });

  describe('qdrantCollectionName', () => {
    it('should generate correct Qdrant collection name', () => {
      expect(qdrantCollectionName('demo', 'contact')).toBe('demo_contact_vectors');
    });

    it('should handle special characters', () => {
      expect(qdrantCollectionName('demo-tenant', 'contact_name')).toBe(
        'demo_tenant_contact_name_vectors'
      );
    });
  });

  describe('getEmbeddableFields', () => {
    it('should return embeddable string and text fields', () => {
      const entityDef: EntityDefinition = {
        name: 'contact',
        fields: [
          {
            name: 'name',
            type: 'string',
            required: true,
            indexed: true,
            searchable: true,
            embeddable: true,
          },
          {
            name: 'email',
            type: 'email',
            required: true,
            indexed: true,
            searchable: true,
            embeddable: false,
          },
          {
            name: 'description',
            type: 'text',
            required: false,
            indexed: false,
            searchable: true,
            embeddable: true,
          },
        ],
      };

      const result = getEmbeddableFields(entityDef);

      expect(result).toEqual(['name', 'description']);
    });

    it('should return empty array if no embeddable fields', () => {
      const entityDef: EntityDefinition = {
        name: 'contact',
        fields: [
          {
            name: 'email',
            type: 'email',
            required: true,
            indexed: true,
            searchable: true,
            embeddable: false,
          },
        ],
      };

      const result = getEmbeddableFields(entityDef);

      expect(result).toEqual([]);
    });
  });

  describe('concatFields', () => {
    it('should concatenate field values', () => {
      const doc = {
        name: 'John Doe',
        description: 'Test description',
        email: 'john@example.com',
      };

      const result = concatFields(doc, ['name', 'description']);

      expect(result).toBe('John Doe Test description');
    });

    it('should handle missing fields', () => {
      const doc = {
        name: 'John Doe',
      };

      const result = concatFields(doc, ['name', 'description']);

      expect(result).toBe('John Doe');
    });

    it('should filter out empty values', () => {
      const doc = {
        name: 'John Doe',
        description: '',
        notes: null,
      };

      const result = concatFields(doc, ['name', 'description', 'notes']);

      expect(result).toBe('John Doe');
    });
  });
});
