import { ConfigCache } from './cache';
import type { TenantConfig, UnitConfig, EntitiesConfig, PermissionsConfig } from '@crm-atlas/types';

describe('ConfigCache', () => {
  let cache: ConfigCache;

  beforeEach(() => {
    cache = new ConfigCache();
  });

  describe('Tenant config', () => {
    it('should store and retrieve tenant config', () => {
      const config: TenantConfig = {
        tenant_id: 'acme',
        name: 'Acme Corp',
      };

      cache.setTenant('acme', config);
      const retrieved = cache.getTenant('acme');

      expect(retrieved).toEqual(config);
    });

    it('should return undefined for non-existent tenant', () => {
      const retrieved = cache.getTenant('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Unit config', () => {
    it('should store and retrieve unit config', () => {
      const units: UnitConfig[] = [
        { unit_id: 'sales', name: 'Sales', tenant_id: 'acme' },
        { unit_id: 'support', name: 'Support', tenant_id: 'acme' },
      ];

      cache.setUnits('acme', units);
      const retrieved = cache.getUnit('acme', 'sales');

      expect(retrieved).toEqual(units[0]);
    });

    it('should return undefined for non-existent unit', () => {
      cache.setUnits('acme', []);
      const retrieved = cache.getUnit('acme', 'nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Entities config', () => {
    it('should store and retrieve entity definition', () => {
      const config: EntitiesConfig = {
        tenant_id: 'acme',
        entities: [
          {
            name: 'lead',
            fields: [
              {
                name: 'name',
                type: 'string',
                required: true,
                indexed: false,
                searchable: false,
                embeddable: false,
              },
            ],
          },
        ],
      };

      cache.setEntities('acme', config);
      const entity = cache.getEntity({ tenant_id: 'acme', unit_id: 'sales' }, 'lead');

      expect(entity).toEqual(config.entities[0]);
    });

    it('should return undefined for non-existent entity', () => {
      const config: EntitiesConfig = {
        tenant_id: 'acme',
        entities: [],
      };

      cache.setEntities('acme', config);
      const entity = cache.getEntity({ tenant_id: 'acme', unit_id: 'sales' }, 'nonexistent');

      expect(entity).toBeUndefined();
    });
  });

  describe('Permissions config', () => {
    it('should store and retrieve permissions config', () => {
      const config: PermissionsConfig = {
        tenant_id: 'acme',
        roles: [{ role: 'admin', scopes: ['crm:read', 'crm:write'] }],
      };

      cache.setPermissions('acme', config);
      const retrieved = cache.getPermissions('acme');

      expect(retrieved).toEqual(config);
    });
  });

  describe('Clear cache', () => {
    it('should clear cache for specific tenant', () => {
      cache.setTenant('acme', { tenant_id: 'acme', name: 'Acme' });
      cache.setTenant('other', { tenant_id: 'other', name: 'Other' });

      cache.clear('acme');

      expect(cache.getTenant('acme')).toBeUndefined();
      expect(cache.getTenant('other')).toBeDefined();
    });

    it('should clear all cache', () => {
      cache.setTenant('acme', { tenant_id: 'acme', name: 'Acme' });
      cache.setTenant('other', { tenant_id: 'other', name: 'Other' });

      cache.clear();

      expect(cache.getTenant('acme')).toBeUndefined();
      expect(cache.getTenant('other')).toBeUndefined();
    });
  });
});
