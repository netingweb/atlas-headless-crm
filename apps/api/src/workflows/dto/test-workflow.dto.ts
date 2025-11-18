import { IsObject, IsOptional } from 'class-validator';

export class TestWorkflowDto {
  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;
}
