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

  // These fields are allowed in the request but will be filtered out by the service
  // They are included here to pass validation, but the service preserves the original values
  @IsString()
  @IsOptional()
  workflow_id?: string; // Will be ignored by service

  @IsString()
  @IsOptional()
  tenant_id?: string; // Will be ignored by service

  @IsString()
  @IsOptional()
  unit_id?: string; // Will be preserved if provided

  @IsString()
  @IsOptional()
  created_at?: string; // Will be ignored by service

  @IsString()
  @IsOptional()
  updated_at?: string; // Will be ignored by service (service sets it automatically)
}
