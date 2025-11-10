import { Module, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowEngine } from '../../../workflow/src/workflow-engine';

@Module({
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
  imports: [],
})
export class WorkflowsModule implements OnModuleInit {
  private workflowEngine: WorkflowEngine | null = null;

  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async onModuleInit(): Promise<void> {
    // Initialize workflow engine with event emitter
    this.workflowEngine = new WorkflowEngine(this.eventEmitter);
    await this.workflowEngine.start();

    // Inject workflow engine into service
    this.workflowsService.setWorkflowEngine(this.workflowEngine);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.workflowEngine) {
      await this.workflowEngine.stop();
    }
  }
}
