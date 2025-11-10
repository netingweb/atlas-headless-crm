import { IsString, IsEnum, IsBoolean, IsOptional, IsObject, IsArray } from 'class-validator';
import type { WorkflowTrigger, WorkflowAction } from '@crm-atlas/types';

export class CreateWorkflowDto {
  @IsString()
  @IsOptional()
  workflow_id?: string;

  @IsString()
  @IsOptional()
  unit_id?: string;

  @IsString()
  name!: string;

  @IsEnum(['event', 'schedule', 'manual'])
  type!: 'event' | 'schedule' | 'manual';

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsEnum(['active', 'inactive', 'draft'])
  @IsOptional()
  status?: 'active' | 'inactive' | 'draft';

  @IsObject()
  trigger!: WorkflowTrigger;

  @IsArray()
  actions!: WorkflowAction[];

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
