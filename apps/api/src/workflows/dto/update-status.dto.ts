import { IsEnum, IsBoolean, IsOptional } from 'class-validator';

export class UpdateWorkflowStatusDto {
  @IsEnum(['active', 'inactive', 'draft'])
  status!: 'active' | 'inactive' | 'draft';

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
