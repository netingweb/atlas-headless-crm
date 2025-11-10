import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mcpApi, type MCPTool } from '@/lib/api/mcp';
import { useAuthStore } from '@/stores/auth-store';
import { useAIStore } from '@/stores/ai-store';
import { Loader2, Code, FileText, CheckCircle2, CheckSquare, Square } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, Fragment } from 'react';
import { Button } from '@/components/ui/button';

export default function MCPToolsTab() {
  const { tenantId, unitId } = useAuthStore();
  const { disabledTools, setToolEnabled, disableAllTools } = useAIStore();
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const {
    data: tools,
    isLoading,
    error,
  } = useQuery<MCPTool[]>({
    queryKey: ['mcpTools', tenantId, unitId],
    queryFn: () => mcpApi.listTools(tenantId || '', unitId || ''),
    enabled: !!tenantId && !!unitId,
  });

  const isToolEnabled = (toolName: string): boolean => {
    // Tool is enabled if it's NOT in the disabled set
    return !disabledTools.has(toolName);
  };

  const toggleExpand = (toolName: string) => {
    setExpandedTool(expandedTool === toolName ? null : toolName);
  };

  const formatSchema = (schema: Record<string, unknown>): string => {
    try {
      return JSON.stringify(schema, null, 2);
    } catch {
      return String(schema);
    }
  };

  const getToolType = (toolName: string): string => {
    if (toolName.startsWith('create_')) return 'create';
    if (toolName.startsWith('search_')) return 'search';
    if (toolName.startsWith('get_')) return 'get';
    if (toolName.startsWith('update_')) return 'update';
    if (toolName.startsWith('delete_')) return 'delete';
    return 'other';
  };

  const getToolTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      search: 'bg-blue-100 text-blue-800',
      get: 'bg-purple-100 text-purple-800',
      update: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors.other;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading MCP tools...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-500">
            <p>Failed to load MCP tools</p>
            <p className="text-sm mt-2">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tools || tools.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <p>No MCP tools available</p>
            <p className="text-sm mt-2">
              Make sure you have entities configured for this tenant/unit
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            MCP Tools Available
          </CardTitle>
          <CardDescription>
            All MCP tools exposed by the server for tenant <strong>{tenantId}</strong> and unit{' '}
            <strong>{unitId}</strong>. These tools can be used by AI agents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                Total tools: <strong>{tools.length}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Enabled:{' '}
                <strong>
                  {tools.filter((t) => !disabledTools.has(t.name)).length} / {tools.length}
                </strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  tools.forEach((tool) => setToolEnabled(tool.name, true));
                }}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Enable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (tools) {
                    disableAllTools(tools.map((t) => t.name));
                  }
                }}
              >
                <Square className="h-4 w-4 mr-1" />
                Disable All
              </Button>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Enable</TableHead>
                  <TableHead className="w-[200px]">Tool Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool) => {
                  const toolType = getToolType(tool.name);
                  const isExpanded = expandedTool === tool.name;
                  const enabled = isToolEnabled(tool.name);
                  const schema = tool.inputSchema || {};
                  return (
                    <Fragment key={tool.name}>
                      <TableRow className={isExpanded ? 'bg-gray-50' : ''}>
                        <TableCell>
                          <div className="flex items-center">
                            <Checkbox
                              checked={enabled}
                              onCheckedChange={(checked) => {
                                setToolEnabled(tool.name, checked === true);
                              }}
                              className="cursor-pointer"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <code
                            className={`text-sm font-mono px-2 py-1 rounded ${
                              enabled ? 'bg-gray-50' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {tool.name}
                          </code>
                        </TableCell>
                        <TableCell>
                          <p className={`text-sm ${enabled ? '' : 'text-gray-400'}`}>
                            {tool.description}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={getToolTypeBadge(toolType)}>{toolType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(tool.name)}
                            className="h-8"
                          >
                            {isExpanded ? (
                              <>
                                <FileText className="h-4 w-4 mr-1" />
                                Hide Schema
                              </>
                            ) : (
                              <>
                                <Code className="h-4 w-4 mr-1" />
                                Show Schema
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-gray-50 p-4">
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">
                                  Tool Description
                                </h4>
                                <p className="text-sm text-gray-600 bg-white border border-gray-200 p-3 rounded-md">
                                  {tool.description || 'No description available'}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                  <Code className="h-4 w-4" />
                                  Schema JSON
                                </h4>
                                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                                  <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                                    <code>{formatSchema(schema)}</code>
                                  </pre>
                                </div>
                              </div>
                              {schema.properties && Object.keys(schema.properties).length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                    Properties
                                  </h4>
                                  <div className="bg-white border border-gray-200 p-3 rounded-md">
                                    <ul className="space-y-2">
                                      {Object.entries(
                                        schema.properties as Record<string, unknown>
                                      ).map(([key, value], propIdx) => {
                                        const prop = value as {
                                          type?: string;
                                          description?: string;
                                          enum?: unknown[];
                                        };
                                        const isRequired = Array.isArray(schema.required)
                                          ? (schema.required as string[]).includes(key)
                                          : false;
                                        return (
                                          <li
                                            key={`${tool.name}-prop-${propIdx}-${key}`}
                                            className="text-sm"
                                          >
                                            <div className="flex items-start gap-2">
                                              <code className="font-mono text-xs bg-gray-100 px-2 py-1 rounded font-semibold">
                                                {key}
                                              </code>
                                              {isRequired && (
                                                <Badge variant="outline" className="text-xs">
                                                  required
                                                </Badge>
                                              )}
                                              {prop.type && (
                                                <span className="text-gray-500 text-xs">
                                                  ({prop.type})
                                                </span>
                                              )}
                                            </div>
                                            {prop.description && (
                                              <p className="text-gray-600 text-xs mt-1 ml-2">
                                                {prop.description}
                                              </p>
                                            )}
                                            {prop.enum && Array.isArray(prop.enum) && (
                                              <p className="text-gray-500 text-xs mt-1 ml-2">
                                                <strong>Allowed values:</strong>{' '}
                                                {prop.enum.map((v) => `"${v}"`).join(', ')}
                                              </p>
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                </div>
                              )}
                              <div className="text-sm text-gray-600">
                                <p>
                                  <strong>Required fields:</strong>{' '}
                                  {Array.isArray(schema.required) && schema.required.length > 0
                                    ? (schema.required as string[]).join(', ')
                                    : 'None'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tool Categories Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Tool Categories</CardTitle>
          <CardDescription>Breakdown of tools by operation type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['create', 'search', 'get', 'update', 'delete', 'other'].map((type) => {
              const count = tools.filter((tool) => getToolType(tool.name) === type).length;
              if (count === 0) return null;
              return (
                <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                  <Badge className={getToolTypeBadge(type)}>{type}</Badge>
                  <p className="text-2xl font-bold mt-2">{count}</p>
                  <p className="text-xs text-gray-500">tools</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
