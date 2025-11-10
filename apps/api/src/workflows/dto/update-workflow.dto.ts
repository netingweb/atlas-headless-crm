import { IsString, IsEnum, IsBoolean, IsOptional, IsObject, IsArray } from 'class-validator';
import type { WorkflowTrigger, WorkflowAction } from '@crm-atlas/types';

export class UpdateWorkflowDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['event', 'schedule', 'manual'])
  @IsOptional()
  type?: 'event' | 'schedule' | 'manual';

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsEnum(['active', 'inactive', 'draft'])
  @IsOptional()
  status?: 'active' | 'inactive' | 'draft';

  @IsObject()
  @IsOptional()
  trigger?: WorkflowTrigger;

  @IsArray()
  @IsOptional()
  actions?: WorkflowAction[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  chained_workflows?: string[];

  @IsObject()
  @IsOptional()
  metadata?: {
    created_by?: string;
    updated_by?: string;
    description?: string;
    tags?: string[];
    version?: number;
  };
}
