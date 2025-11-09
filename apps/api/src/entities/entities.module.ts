import { Module } from '@nestjs/common';
import { EntitiesController } from './entities.controller';
import { EntitiesService } from './entities.service';
import { RelationsService } from './relations.service';

@Module({
  controllers: [EntitiesController],
  providers: [EntitiesService, RelationsService],
})
export class EntitiesModule {}
