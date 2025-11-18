import { Test, TestingModule } from '@nestjs/testing';
import { EntitiesService } from './entities.service';
import { RelationsService } from './relations.service';
import { EntityEvents } from './entities.events';
import { EntityRepository } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { ValidatorCache } from '@crm-atlas/core';
import type { TenantContext } from '@crm-atlas/core';
import { NotFoundError, ValidationError } from '@crm-atlas/core';
import type { EntityDefinition } from '@crm-atlas/types';

const mockDb = {
  collection: jest.fn(() => ({
    findOne: jest.fn(),
    find: jest.fn(() => ({
      toArray: jest.fn(),
    })),
  })),
};

jest.mock('@crm-atlas/db', () => ({
  ...jest.requireActual('@crm-atlas/db'),
  getDb: jest.fn(() => mockDb),
  EntityRepository: jest.fn(),
}));
jest.mock('@crm-atlas/config', () => ({
  ...jest.requireActual('@crm-atlas/config'),
  MongoConfigLoader: jest.fn().mockImplementation(() => ({
    getEntity: jest.fn(),
    getTenant: jest.fn(),
    getUnits: jest.fn(),
    getUnit: jest.fn(),
    getEntities: jest.fn(),
    getPermissions: jest.fn(),
  })),
}));
jest.mock('@crm-atlas/search');

describe('EntitiesService', () => {
  let service: EntitiesService;
  let relationsService: RelationsService;
  let repository: jest.Mocked<EntityRepository>;
  let configLoader: jest.Mocked<MongoConfigLoader>;
  let validatorCache: ValidatorCache;
  let ctx: TenantContext;

  beforeEach(async () => {
    ctx = { tenant_id: 'test', unit_id: 'test-unit' };

    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    } as any;

    // Mock EntityRepository to return our mock instance
    (EntityRepository as jest.MockedClass<typeof EntityRepository>).mockImplementation(
      () => repository as any
    );

    // Create a mock instance of MongoConfigLoader
    const mockConfigLoaderInstance = {
      getEntity: jest.fn(),
      getTenant: jest.fn(),
      getUnits: jest.fn(),
      getUnit: jest.fn(),
      getEntities: jest.fn(),
      getPermissions: jest.fn(),
    };

    (MongoConfigLoader as jest.MockedClass<typeof MongoConfigLoader>).mockImplementation(
      () => mockConfigLoaderInstance as any
    );
    configLoader = mockConfigLoaderInstance as any;

    validatorCache = new ValidatorCache();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitiesService,
        RelationsService,
        {
          provide: EntityRepository,
          useValue: repository,
        },
        {
          provide: ValidatorCache,
          useValue: validatorCache,
        },
        {
          provide: EntityEvents,
          useValue: {
            emitEntityCreated: jest.fn(),
            emitEntityUpdated: jest.fn(),
            emitEntityDeleted: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EntitiesService>(EntitiesService);
    relationsService = module.get<RelationsService>(RelationsService);
  });

  describe('create', () => {
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
      ],
    };

    it('should create an entity successfully', async () => {
      const data = { name: 'Test Contact', email: 'test@example.com' };
      const created = { _id: '123', ...data, tenant_id: ctx.tenant_id, unit_id: ctx.unit_id };

      configLoader.getEntity.mockResolvedValue(entityDef);
      repository.create.mockResolvedValue(created as any);
      jest.spyOn(relationsService, 'validateReferences').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'indexEntity').mockResolvedValue(undefined);

      const result = await service.create(ctx, 'contact', data);

      expect(result).toEqual(created);
      expect(configLoader.getEntity).toHaveBeenCalledWith(ctx, 'contact');
      expect(repository.create).toHaveBeenCalledWith(ctx, 'contact', data);
    });

    it('should throw NotFoundError if entity definition not found', async () => {
      configLoader.getEntity.mockResolvedValue(null);

      await expect(service.create(ctx, 'unknown', {})).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if validation fails', async () => {
      const invalidData = { name: 'Test' }; // Missing required email

      configLoader.getEntity.mockResolvedValue(entityDef);

      await expect(service.create(ctx, 'contact', invalidData)).rejects.toThrow(ValidationError);
    });
  });

  describe('findById', () => {
    it('should return entity by id', async () => {
      const entityDef: EntityDefinition = {
        name: 'contact',
        fields: [],
      };
      const doc = { _id: '123', name: 'Test Contact' };

      configLoader.getEntity.mockResolvedValue(entityDef);
      repository.findById.mockResolvedValue(doc as any);

      const result = await service.findById(ctx, 'contact', '123');

      expect(result).toEqual(doc);
      expect(repository.findById).toHaveBeenCalledWith(ctx, 'contact', '123');
    });

    it('should throw NotFoundError if entity not found', async () => {
      const entityDef: EntityDefinition = {
        name: 'contact',
        fields: [],
      };

      configLoader.getEntity.mockResolvedValue(entityDef);
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(ctx, 'contact', '123')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should update entity successfully', async () => {
      const entityDef: EntityDefinition = {
        name: 'contact',
        fields: [
          {
            name: 'name',
            type: 'string',
            required: false,
            indexed: true,
            searchable: true,
            embeddable: true,
          },
        ],
      };
      const data = { name: 'Updated Name' };
      const updated = { _id: '123', name: 'Updated Name' };

      configLoader.getEntity.mockResolvedValue(entityDef);
      repository.update.mockResolvedValue(updated as any);
      jest.spyOn(relationsService, 'validateReferences').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'indexEntity').mockResolvedValue(undefined);

      const result = await service.update(ctx, 'contact', '123', data);

      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith(ctx, 'contact', '123', data);
    });
  });

  describe('delete', () => {
    it('should delete entity successfully', async () => {
      const entityDef: EntityDefinition = {
        name: 'contact',
        fields: [],
      };

      configLoader.getEntity.mockResolvedValue(entityDef);
      repository.delete.mockResolvedValue(true);
      jest.spyOn(service as any, 'removeFromIndexes').mockResolvedValue(undefined);

      await service.delete(ctx, 'contact', '123');

      expect(repository.delete).toHaveBeenCalledWith(ctx, 'contact', '123');
    });

    it('should throw NotFoundError if entity not found', async () => {
      const entityDef: EntityDefinition = {
        name: 'contact',
        fields: [],
      };

      configLoader.getEntity.mockResolvedValue(entityDef);
      repository.delete.mockResolvedValue(false);

      await expect(service.delete(ctx, 'contact', '123')).rejects.toThrow(NotFoundError);
    });
  });
});
