import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EntityEvents {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emitEntityCreated(
    tenantId: string,
    unitId: string,
    entity: string,
    entityId: string,
    data: Record<string, unknown>
  ): void {
    this.eventEmitter.emit('entity.created', {
      tenant_id: tenantId,
      unit_id: unitId,
      entity,
      entity_id: entityId,
      data,
    });
  }

  emitEntityUpdated(
    tenantId: string,
    unitId: string,
    entity: string,
    entityId: string,
    data: Record<string, unknown>
  ): void {
    this.eventEmitter.emit('entity.updated', {
      tenant_id: tenantId,
      unit_id: unitId,
      entity,
      entity_id: entityId,
      data,
    });
  }

  emitEntityDeleted(tenantId: string, unitId: string, entity: string, entityId: string): void {
    this.eventEmitter.emit('entity.deleted', {
      tenant_id: tenantId,
      unit_id: unitId,
      entity,
      entity_id: entityId,
    });
  }
}
