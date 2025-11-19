import { Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(DocumentsModule.name);

  constructor(private readonly worker: DocumentProcessingWorker) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.worker.start();
      this.logger.log('Document Processing Worker started');
    } catch (error) {
      this.logger.error(
        'Failed to start Document Processing Worker',
        error instanceof Error ? error.stack : String(error)
      );
      // Continue without worker - processing will be queued but not processed
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.worker.stop();
      this.logger.log('Document Processing Worker stopped');
    } catch (error) {
      this.logger.error(
        'Error stopping Document Processing Worker',
        error instanceof Error ? error.stack : String(error)
      );
    }
  }
}
