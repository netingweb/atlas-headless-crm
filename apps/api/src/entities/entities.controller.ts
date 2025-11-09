import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { NotFoundError } from '@crm-atlas/core';
import type { TenantContext } from '@crm-atlas/core';
import { CreateEntityDto, UpdateEntityDto, EntityResponseDto } from '../common/dto/entity.dto';
import { RelationsService } from './relations.service';
import { DynamicEntityValidationPipe } from '../common/pipes/dynamic-entity.pipe';
import { JwtAuthGuard, ScopesGuard, AuthScopes } from '@crm-atlas/auth';

@ApiTags('entities')
@Controller(':tenant/:unit/:entity')
export class EntitiesController {
  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly relationsService: RelationsService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new entity document',
    description:
      'Create a new document for the specified entity type (contact, company, task, note, opportunity).',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({
    name: 'entity',
    description: 'Entity name',
    example: 'contact',
    enum: ['contact', 'company', 'task', 'note', 'opportunity'],
  })
  @ApiBody({ type: CreateEntityDto })
  @ApiCreatedResponse({
    description: 'Entity created successfully',
    type: EntityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Entity type not found' })
  @ApiBearerAuth()
  async create(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('entity') entity: string,
    @Body(DynamicEntityValidationPipe) data: CreateEntityDto
  ): Promise<EntityResponseDto> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.entitiesService.create(ctx, entity, data) as Promise<EntityResponseDto>;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiOperation({
    summary: 'Get entity document by ID',
    description:
      'Retrieve a specific entity document by its ID. Use populate=true to include related entities.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'entity', description: 'Entity name', example: 'contact' })
  @ApiParam({ name: 'id', description: 'Document ID', example: '507f1f77bcf86cd799439011' })
  @ApiQuery({
    name: 'populate',
    description: 'Populate reference fields with related entity data',
    required: false,
    type: Boolean,
  })
  @ApiOkResponse({
    description: 'Entity document found',
    type: EntityResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  @ApiBearerAuth()
  async findById(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Query('populate') populate?: string
  ): Promise<EntityResponseDto> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    const shouldPopulate = populate === 'true';
    return this.entitiesService.findById(
      ctx,
      entity,
      id,
      shouldPopulate
    ) as Promise<EntityResponseDto>;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:write')
  @ApiOperation({
    summary: 'Update entity document',
    description: 'Update an existing entity document. Only provided fields will be updated.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'entity', description: 'Entity name', example: 'contact' })
  @ApiParam({ name: 'id', description: 'Document ID', example: '507f1f77bcf86cd799439011' })
  @ApiBody({ type: UpdateEntityDto })
  @ApiOkResponse({
    description: 'Entity updated successfully',
    type: EntityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  @ApiBearerAuth()
  async update(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Body(DynamicEntityValidationPipe) data: UpdateEntityDto
  ): Promise<EntityResponseDto> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.entitiesService.update(ctx, entity, id, data) as Promise<EntityResponseDto>;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete entity document' })
  @ApiParam({ name: 'tenant', description: 'Tenant ID' })
  @ApiParam({ name: 'unit', description: 'Unit ID' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiBearerAuth()
  async delete(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('entity') entity: string,
    @Param('id') id: string
  ): Promise<void> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.entitiesService.delete(ctx, entity, id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiOperation({
    summary: 'List all entity documents',
    description: 'Retrieve all documents for the specified entity type.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'entity', description: 'Entity name', example: 'contact' })
  @ApiOkResponse({
    description: 'List of entity documents',
    type: [EntityResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiBearerAuth()
  async findAll(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('entity') entity: string
  ): Promise<EntityResponseDto[]> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.entitiesService.findAll(ctx, entity) as Promise<EntityResponseDto[]>;
  }

  @Get(':id/:relatedEntity')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiOperation({
    summary: 'Get related entities',
    description:
      'Get all entities of a related type that reference this entity. Example: GET /company/{id}/contacts returns all contacts for a company.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'entity', description: 'Source entity name', example: 'company' })
  @ApiParam({ name: 'id', description: 'Source entity ID', example: '507f1f77bcf86cd799439011' })
  @ApiParam({
    name: 'relatedEntity',
    description: 'Related entity name',
    example: 'contact',
    enum: ['contact', 'company', 'task', 'note', 'opportunity'],
  })
  @ApiOkResponse({
    description: 'List of related entities',
    type: [EntityResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Entity or related entity not found' })
  @ApiBearerAuth()
  async getRelated(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Param('relatedEntity') relatedEntity: string
  ): Promise<EntityResponseDto[]> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };

    // Find the reference field that points from relatedEntity to entity
    const refFields = await this.relationsService.getReferenceFieldsToEntity(
      ctx,
      relatedEntity,
      entity
    );
    if (refFields.length === 0) {
      throw new NotFoundError(`No reference field found from ${relatedEntity} to ${entity}`);
    }

    // Use the first reference field found (e.g., company_id)
    const referenceField = refFields[0].field.name;
    const related = await this.relationsService.getRelatedEntities(
      ctx,
      entity,
      id,
      relatedEntity,
      referenceField
    );

    return related as EntityResponseDto[];
  }
}
