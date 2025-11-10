import { Module, forwardRef } from '@nestjs/common';
import { MCPController } from './mcp.controller';
import { MCPService } from './mcp.service';
import { EntitiesModule } from '../entities/entities.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [EntitiesModule, forwardRef(() => WorkflowsModule)],
  controllers: [MCPController],
  providers: [MCPService],
  exports: [MCPService],
})
export class MCPModule {}
