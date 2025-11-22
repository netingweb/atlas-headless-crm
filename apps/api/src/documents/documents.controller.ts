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
  Res,
  Req,
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
  ApiConsumes,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto, UpdateDocumentDto, DocumentResponseDto } from './documents.dto';
import { BadRequestException } from '@nestjs/common';
import type { TenantContext } from '@crm-atlas/core';
import { JwtAuthGuard, ScopesGuard, AuthScopes } from '@crm-atlas/auth';
import type { FastifyReply, FastifyRequest } from 'fastify';

@ApiTags('documents')
@Controller(':tenant/:unit/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('documents:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload a new document',
    description: 'Upload a document file and create a document entity.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiBody({ type: UploadDocumentDto })
  @ApiCreatedResponse({
    description: 'Document uploaded successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiBearerAuth()
  async upload(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Req() req: FastifyRequest
  ): Promise<DocumentResponseDto> {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('File is required');
    }

    const buffer = await data.toBuffer();
    const metadata: UploadDocumentDto = {
      title: (data.fields.title as { value: string })?.value || data.filename || 'Untitled',
      document_type: (data.fields.document_type as { value: string })?.value || '',
      related_entity_type: (data.fields.related_entity_type as { value: string })?.value,
      related_entity_id: (data.fields.related_entity_id as { value: string })?.value,
    };

    const file = {
      originalname: data.filename || 'file',
      mimetype: data.mimetype || 'application/octet-stream',
      size: buffer.length,
      buffer,
    };

    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.documentsService.upload(ctx, file, metadata) as Promise<DocumentResponseDto>;
  }

  @Get()
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('documents:read')
  @ApiOperation({
    summary: 'List all documents',
    description: 'Retrieve all documents for the specified tenant and unit.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOkResponse({
    description: 'List of documents',
    type: [DocumentResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiBearerAuth()
  async findAll(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Query() filters?: Record<string, unknown>
  ): Promise<DocumentResponseDto[]> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.documentsService.findAll(ctx, filters) as Promise<DocumentResponseDto[]>;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('documents:read')
  @ApiOperation({
    summary: 'Get document by ID',
    description: 'Retrieve a specific document by its ID.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Document ID', example: '507f1f77bcf86cd799439011' })
  @ApiOkResponse({
    description: 'Document found',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiBearerAuth()
  async findById(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') id: string
  ): Promise<DocumentResponseDto> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.documentsService.findById(ctx, id) as Promise<DocumentResponseDto>;
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('documents:read')
  @ApiOperation({
    summary: 'Download document file',
    description: 'Download the actual file for a document.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiOkResponse({
    description: 'File download',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiBearerAuth()
  async download(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') id: string,
    @Res() res: FastifyReply
  ): Promise<void> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    const doc = (await this.documentsService.findById(ctx, id)) as { mime_type: string };
    const buffer = await this.documentsService.download(ctx, id);

    res.header('Content-Type', doc.mime_type);
    res.header('Content-Disposition', `attachment; filename="document-${id}"`);
    res.send(buffer);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('documents:write')
  @ApiOperation({
    summary: 'Update document metadata',
    description: 'Update document metadata. File cannot be changed.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiBody({ type: UpdateDocumentDto })
  @ApiOkResponse({
    description: 'Document updated successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiBearerAuth()
  async update(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') id: string,
    @Body() data: Record<string, unknown>
  ): Promise<DocumentResponseDto> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.documentsService.update(ctx, id, data) as Promise<DocumentResponseDto>;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('documents:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete document',
    description: 'Permanently delete a document by ID.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Document ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 204, description: 'Document deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiBearerAuth()
  async delete(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') id: string
  ): Promise<void> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.documentsService.delete(ctx, id);
  }

  @Get('entities/:entity/:id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('documents:read')
  @ApiOperation({
    summary: 'Get documents for an entity',
    description: 'Retrieve all documents linked to a specific entity.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'entity', description: 'Entity type', example: 'opportunity' })
  @ApiParam({ name: 'id', description: 'Entity ID' })
  @ApiOkResponse({
    description: 'List of documents',
    type: [DocumentResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiBearerAuth()
  async getEntityDocuments(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('entity') entity: string,
    @Param('id') id: string
  ): Promise<DocumentResponseDto[]> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.documentsService.getEntityDocuments(ctx, entity, id) as Promise<
      DocumentResponseDto[]
    >;
  }
}
