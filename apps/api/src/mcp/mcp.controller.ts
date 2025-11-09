import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { MCPService } from './mcp.service';
import { JwtAuthGuard, ScopesGuard, AuthScopes } from '@crm-atlas/auth';

// CallToolDto without validation decorators - validation handled by SmartValidationPipe
export class CallToolDto {
  name!: string;
  arguments!: Record<string, unknown>;
}

@ApiTags('mcp')
@Controller(':tenant/:unit/mcp')
export class MCPController {
  constructor(private readonly mcpService: MCPService) {}

  @Get('tools')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List available MCP tools',
    description: 'Returns all available MCP tools for the specified tenant and unit.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOkResponse({
    description: 'List of available MCP tools',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async listTools(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string
  ): Promise<Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>> {
    return this.mcpService.listTools(tenant, unit);
  }

  @Post('call-tool')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:write', 'crm:read', 'crm:delete')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Call an MCP tool',
    description:
      'Execute an MCP tool with the provided arguments. Requires appropriate permissions based on tool operation.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiBody({ type: CallToolDto })
  @ApiOkResponse({
    description: 'Tool execution result',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async callTool(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Body() body: CallToolDto
  ): Promise<unknown> {
    // SmartValidationPipe handles validation with forbidNonWhitelisted: false
    return this.mcpService.callTool(tenant, unit, body.name, body.arguments || {});
  }
}
