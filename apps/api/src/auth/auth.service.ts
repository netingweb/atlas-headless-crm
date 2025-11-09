import { Injectable } from '@nestjs/common';
import { UnauthorizedError } from '@crm-atlas/core';
import { hashPassword, verifyPassword, signJwt } from '@crm-atlas/auth';
import { getDb } from '@crm-atlas/db';
import type { User } from '@crm-atlas/types';

@Injectable()
export class AuthService {
  async login(tenantId: string, email: string, password: string): Promise<{ token: string }> {
    const db = getDb();
    const userDoc = await db.collection('users').findOne({
      tenant_id: tenantId,
      email: email.toLowerCase(),
    });

    if (!userDoc) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = userDoc as unknown as User;
    const isValid = await verifyPassword(user.passwordHash, password);

    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = signJwt({
      sub: user._id || '',
      tenant_id: user.tenant_id,
      unit_id: user.unit_id,
      roles: user.roles,
      scopes: user.scopes,
    });

    return { token };
  }

  async createUser(
    tenantId: string,
    unitId: string,
    email: string,
    password: string,
    roles: string[] = [],
    scopes: string[] = []
  ): Promise<User> {
    const db = getDb();
    const passwordHash = await hashPassword(password);
    const now = new Date();

    const user: User = {
      tenant_id: tenantId,
      unit_id: unitId,
      email: email.toLowerCase(),
      passwordHash,
      roles,
      scopes,
      created_at: now,
      updated_at: now,
    };

    const result = await db.collection('users').insertOne(user as any);
    return { ...user, _id: result.insertedId.toString() };
  }
}
