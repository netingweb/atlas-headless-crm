import { Module } from '@nestjs/common';
import { EntitiesController } from './entities.controller';
import { EntitiesService } from './entities.service';
import { RelationsService } from './relations.service';
import { EntityEvents } from './entities.events';

@Module({
  controllers: [EntitiesController],
  providers: [EntitiesService, RelationsService, EntityEvents],
  exports: [EntitiesService, RelationsService],
})
export class EntitiesModule {}
