import { Module } from '@nestjs/common';
import { IndexingController } from './indexing.controller';
import { IndexingService } from './indexing.service';

@Module({
  controllers: [IndexingController],
  providers: [IndexingService],
  exports: [IndexingService],
})
export class IndexingModule {}
