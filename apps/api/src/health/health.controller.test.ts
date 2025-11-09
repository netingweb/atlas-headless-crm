import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { getDb } from '@crm-atlas/db';

jest.mock('@crm-atlas/db');

describe('HealthController', () => {
  let controller: HealthController;
  let mockDb: {
    admin: jest.Mock;
  };

  beforeEach(async () => {
    mockDb = {
      admin: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue({}),
      }),
    };

    (getDb as jest.Mock).mockReturnValue(mockDb);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should return healthy status when MongoDB is available', async () => {
      const result = await controller.check();

      expect(result.status).toBe('healthy');
      expect(result.services.mongodb).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded status when MongoDB is unavailable', async () => {
      mockDb.admin.mockReturnValue({
        ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
      });

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.services.mongodb).toBe('error');
    });
  });

  describe('ready', () => {
    it('should return ready true when MongoDB is available', async () => {
      const result = await controller.ready();

      expect(result.ready).toBe(true);
    });

    it('should return ready false when MongoDB is unavailable', async () => {
      mockDb.admin.mockReturnValue({
        ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
      });

      const result = await controller.ready();

      expect(result.ready).toBe(false);
    });
  });

  describe('live', () => {
    it('should return alive true', () => {
      const result = controller.live();

      expect(result.alive).toBe(true);
    });
  });
});
