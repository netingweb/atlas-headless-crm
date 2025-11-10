import { IsObject, IsOptional, IsString } from 'class-validator';

export class TriggerWorkflowDto {
  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  actor?: string;
}
