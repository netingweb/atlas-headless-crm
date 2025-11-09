import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getDb } from '@crm-atlas/db';
import { UnauthorizedError } from '@crm-atlas/core';
import type { TenantContext } from '@crm-atlas/core';

jest.mock('@crm-atlas/db');
jest.mock('@crm-atlas/auth', () => ({
  hashPassword: jest.fn((pwd) => Promise.resolve(`hashed_${pwd}`)),
  verifyPassword: jest.fn((pwd, hash) => Promise.resolve(hash === `hashed_${pwd}`)),
  signJwt: jest.fn(() => 'mock-jwt-token'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockDb: any;
  let ctx: TenantContext;

  beforeEach(async () => {
    ctx = { tenant_id: 'test', unit_id: 'test-unit' };

    mockDb = {
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        insertOne: jest.fn(),
      }),
    };

    (getDb as jest.Mock).mockReturnValue(mockDb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return JWT token on successful login', async () => {
      const user = {
        _id: '123',
        tenant_id: 'test',
        email: 'test@example.com',
        password: 'hashed_password123',
      };

      mockDb.collection().findOne.mockResolvedValue(user);

      const result = await service.login(ctx.tenant_id, 'test@example.com', 'password123');

      expect(result).toHaveProperty('token');
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should throw UnauthorizedError if user not found', async () => {
      mockDb.collection().findOne.mockResolvedValue(null);

      await expect(service.login(ctx.tenant_id, 'test@example.com', 'password123')).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('should throw UnauthorizedError if password is incorrect', async () => {
      const user = {
        _id: '123',
        tenant_id: 'test',
        email: 'test@example.com',
        password: 'hashed_wrong_password',
      };

      mockDb.collection().findOne.mockResolvedValue(user);

      await expect(service.login(ctx.tenant_id, 'test@example.com', 'password123')).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        tenant_id: 'test',
        email: 'newuser@example.com',
        password: 'password123',
      };

      mockDb.collection().insertOne.mockResolvedValue({
        insertedId: 'new-user-id',
      });

      const result = await service.createUser(ctx, userData.email, userData.password);

      expect(result).toHaveProperty('_id');
      expect(result.email).toBe(userData.email);
      expect(mockDb.collection().insertOne).toHaveBeenCalled();
    });
  });
});
