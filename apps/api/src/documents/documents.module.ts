import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsQueueController } from './documents-queue.controller';
import { DocumentsService } from './documents.service';
import { DocumentProcessingWorker } from './documents.worker';

@Module({
  controllers: [DocumentsController, DocumentsQueueController],
  providers: [DocumentsService, DocumentProcessingWorker],
  exports: [DocumentsService, DocumentProcessingWorker],
})
export class DocumentsModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly worker: DocumentProcessingWorker) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.worker.start();
      console.log('✅ Document Processing Worker started');
    } catch (error) {
      console.error('⚠️ Failed to start Document Processing Worker:', error);
      // Continue without worker - processing will be queued but not processed
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.worker.stop();
      console.log('✅ Document Processing Worker stopped');
    } catch (error) {
      console.error('⚠️ Error stopping Document Processing Worker:', error);
    }
  }
}
