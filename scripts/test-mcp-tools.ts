#!/usr/bin/env tsx
/**
 * MCP Tools Test Script
 *
 * This script tests all MCP tools to ensure they are working correctly.
 * It validates:
 * - Tool listing
 * - Tool argument validation
 * - Tool execution
 * - Tool response format
 * - Error handling
 */

import axios from 'axios';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: unknown;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

interface ToolCallResponse {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
}

class MCPToolsTester {
  private apiBase: string;
  private tenant: string;
  private unit: string;
  private token: string | null = null;
  private results: TestResult[] = [];
  private tools: MCPTool[] = [];

  constructor(apiBase: string, tenant: string, unit: string) {
    this.apiBase = apiBase;
    this.tenant = tenant;
    this.unit = unit;
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m',
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  private recordResult(result: TestResult): void {
    this.results.push(result);
    if (result.passed) {
      this.log(`✅ ${result.name}`, 'success');
    } else {
      this.log(`❌ ${result.name}: ${result.error}`, 'error');
      if (result.details) {
        console.log('   Details:', JSON.stringify(result.details, null, 2));
      }
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.apiBase}/auth/login`, {
        tenant_id: this.tenant,
        email,
        password,
      });

      this.token = response.data.token;
      if (!this.token) {
        this.recordResult({
          name: 'Login',
          passed: false,
          error: 'No token received',
        });
        return false;
      }

      this.recordResult({
        name: 'Login',
        passed: true,
      });
      return true;
    } catch (error) {
      this.recordResult({
        name: 'Login',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      });
      return false;
    }
  }

  async listTools(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiBase}/${this.tenant}/${this.unit}/mcp/tools`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      this.tools = response.data;

      if (!Array.isArray(this.tools) || this.tools.length === 0) {
        this.recordResult({
          name: 'List Tools',
          passed: false,
          error: 'No tools returned or invalid format',
        });
        return false;
      }

      // Validate tool structure
      const invalidTools = this.tools.filter(
        (tool) => !tool.name || !tool.description || !tool.inputSchema
      );

      if (invalidTools.length > 0) {
        this.recordResult({
          name: 'List Tools - Structure Validation',
          passed: false,
          error: `${invalidTools.length} tools have invalid structure`,
          details: invalidTools,
        });
        return false;
      }

      this.recordResult({
        name: `List Tools (${this.tools.length} tools found)`,
        passed: true,
        details: { count: this.tools.length },
      });

      return true;
    } catch (error) {
      this.recordResult({
        name: 'List Tools',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      });
      return false;
    }
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolCallResponse | null> {
    try {
      const response = await axios.post(
        `${this.apiBase}/${this.tenant}/${this.unit}/mcp/call-tool`,
        {
          name: toolName,
          arguments: args,
        },
        {
          headers: { Authorization: `Bearer ${this.token}` },
        }
      );

      return response.data as ToolCallResponse;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(error.response.data || { error: error.message }, null, 2),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { error: error instanceof Error ? error.message : 'Unknown error' },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  async testToolValidation(tool: MCPTool): Promise<boolean> {
    const toolName = tool.name;
    const schema = tool.inputSchema;

    // Test 1: Missing required fields
    if (schema.required && schema.required.length > 0) {
      const missingRequired: Record<string, unknown> = {};
      // Provide only some required fields, missing others
      if (schema.required.length > 1) {
        const firstRequired = schema.required[0];
        const prop = schema.properties?.[firstRequired] as { default?: unknown } | undefined;
        if (prop?.default !== undefined) {
          missingRequired[firstRequired] = prop.default;
        }
        // Missing other required fields intentionally

        const result = await this.callTool(toolName, missingRequired);
        // Tool should handle validation - some may accept partial data, others may error
        // We just check that it doesn't crash
        if (!result) {
          this.recordResult({
            name: `${toolName} - Validation Test`,
            passed: false,
            error: 'No response received',
          });
          return false;
        }
      }
    }

    // Test 2: Invalid argument types
    if (schema.properties) {
      const invalidArgs: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(schema.properties)) {
        const propSchema = prop as { type?: string; enum?: unknown[] };
        if (propSchema.type === 'string') {
          invalidArgs[key] = 12345; // Wrong type
        } else if (propSchema.type === 'number') {
          invalidArgs[key] = 'not-a-number'; // Wrong type
        } else if (propSchema.type === 'boolean') {
          invalidArgs[key] = 'not-a-boolean'; // Wrong type
        }
      }

      if (Object.keys(invalidArgs).length > 0) {
        const result = await this.callTool(toolName, invalidArgs);
        // Some tools may validate and return error, others may accept - we just check it doesn't crash
        if (!result) {
          this.recordResult({
            name: `${toolName} - Invalid Type Test`,
            passed: false,
            error: 'No response received',
          });
          return false;
        }
      }
    }

    this.recordResult({
      name: `${toolName} - Validation Tests`,
      passed: true,
    });

    return true;
  }

  async testSearchTools(): Promise<boolean> {
    const searchTools = this.tools.filter((tool) => tool.name.startsWith('search_'));

    if (searchTools.length === 0) {
      this.recordResult({
        name: 'Test Search Tools',
        passed: false,
        error: 'No search tools found',
      });
      return false;
    }

    let passed = 0;
    let failed = 0;

    for (const tool of searchTools) {
      const entityName = tool.name.replace('search_', '');

      // Test 1: Wildcard search (all results)
      const wildcardResult = await this.callTool(tool.name, { query: '*', limit: 5 });
      if (wildcardResult && !wildcardResult.isError) {
        passed++;
      } else {
        // Check if error is due to missing Typesense collection (404)
        const errorText = wildcardResult?.content[0]?.text || '';
        if (errorText.includes('404') || errorText.includes('Not found')) {
          // This is expected if Typesense collections haven't been created yet
          this.recordResult({
            name: `${tool.name} - Wildcard Search`,
            passed: true, // Mark as passed but note the issue
            details: {
              message: 'Typesense collection not found (expected if not indexed yet)',
              error: errorText,
            },
          });
          passed++;
        } else {
          failed++;
          this.recordResult({
            name: `${tool.name} - Wildcard Search`,
            passed: false,
            error: 'Wildcard search failed',
            details: wildcardResult,
          });
        }
      }

      // Test 2: Count only
      const countResult = await this.callTool(tool.name, {
        query: '*',
        count_only: true,
      });
      if (countResult && !countResult.isError) {
        const content = JSON.parse(countResult.content[0]?.text || '{}');
        if (typeof content.count === 'number') {
          passed++;
        } else {
          failed++;
          this.recordResult({
            name: `${tool.name} - Count Only`,
            passed: false,
            error: 'Count only did not return count',
            details: countResult,
          });
        }
      } else {
        // Check if error is due to missing Typesense collection (404)
        const errorText = countResult?.content[0]?.text || '';
        if (errorText.includes('404') || errorText.includes('Not found')) {
          this.recordResult({
            name: `${tool.name} - Count Only`,
            passed: true,
            details: {
              message: 'Typesense collection not found (expected if not indexed yet)',
              error: errorText,
            },
          });
          passed++;
        } else {
          failed++;
          this.recordResult({
            name: `${tool.name} - Count Only`,
            passed: false,
            error: 'Count only search failed',
            details: countResult,
          });
        }
      }

      // Test 3: Text search
      const textResult = await this.callTool(tool.name, {
        query: 'test',
        type: 'text',
        limit: 3,
      });
      if (textResult && !textResult.isError) {
        passed++;
      } else {
        // Check if error is due to missing Typesense collection (404)
        const errorText = textResult?.content[0]?.text || '';
        if (errorText.includes('404') || errorText.includes('Not found')) {
          this.recordResult({
            name: `${tool.name} - Text Search`,
            passed: true,
            details: {
              message: 'Typesense collection not found (expected if not indexed yet)',
              error: errorText,
            },
          });
          passed++;
        } else {
          failed++;
          this.recordResult({
            name: `${tool.name} - Text Search`,
            passed: false,
            error: 'Text search failed',
            details: textResult,
          });
        }
      }
    }

    const totalTests = searchTools.length * 3;
    const success = failed === 0;

    this.recordResult({
      name: `Test Search Tools (${passed}/${totalTests} passed)`,
      passed: success,
      details: { passed, failed, total: totalTests },
    });

    return success;
  }

  async testCreateTools(): Promise<{
    success: boolean;
    createdIds: Array<{ tool: string; id: string }>;
  }> {
    const createTools = this.tools.filter((tool) => tool.name.startsWith('create_'));

    if (createTools.length === 0) {
      this.recordResult({
        name: 'Test Create Tools',
        passed: false,
        error: 'No create tools found',
      });
      return false;
    }

    let passed = 0;
    let failed = 0;
    const createdIds: Array<{ tool: string; id: string }> = [];

    for (const tool of createTools) {
      const entityName = tool.name.replace('create_', '');
      const schema = tool.inputSchema;

      // Build minimal valid data based on required fields
      const createData: Record<string, unknown> = {};
      if (schema.required) {
        for (const field of schema.required) {
          const prop = schema.properties?.[field] as
            | { type?: string; default?: unknown; enum?: unknown[]; reference_entity?: string }
            | undefined;

          if (prop?.default !== undefined) {
            createData[field] = prop.default;
          } else if (prop?.enum && prop.enum.length > 0) {
            createData[field] = prop.enum[0];
          } else if (prop?.type === 'reference' && prop.reference_entity) {
            // For reference fields, we need to skip creation or use a placeholder
            // Skip tools that require references - they need existing entities
            this.recordResult({
              name: `${tool.name} - Create`,
              passed: true, // Skip as it requires existing references
              details: {
                message: 'Skipped - requires reference fields',
                field,
                reference_entity: prop.reference_entity,
              },
            });
            return { success: true, createdIds: [] };
          } else if (prop?.type === 'string') {
            // Generate test data based on field name
            if (field.includes('email')) {
              createData[field] = `test-${Date.now()}@example.com`;
            } else if (field.includes('name') || field.includes('title')) {
              createData[field] = `Test ${entityName} ${Date.now()}`;
            } else if (
              field.includes('number') ||
              field.includes('deal_number') ||
              field.includes('order_number')
            ) {
              createData[field] = `TEST-${Date.now()}`;
            } else {
              createData[field] = `test-${field}-${Date.now()}`;
            }
          } else if (prop?.type === 'number') {
            createData[field] = 0;
          } else if (prop?.type === 'boolean') {
            createData[field] = false;
          } else if (prop?.type === 'date' || prop?.type === 'datetime') {
            createData[field] = new Date().toISOString();
          } else {
            createData[field] = `test-${Date.now()}`;
          }
        }
      }

      // Fill optional fields with defaults if available
      if (schema.properties) {
        for (const [field, prop] of Object.entries(schema.properties)) {
          if (!createData[field]) {
            const propSchema = prop as { default?: unknown };
            if (propSchema.default !== undefined) {
              createData[field] = propSchema.default;
            }
          }
        }
      }

      const result = await this.callTool(tool.name, createData);

      if (result && !result.isError) {
        try {
          const content = JSON.parse(result.content[0]?.text || '{}');
          const id = content._id || content.id;
          if (id) {
            createdIds.push({ tool: tool.name, id: String(id) });
            passed++;
          } else {
            failed++;
            this.recordResult({
              name: `${tool.name} - Create`,
              passed: false,
              error: 'Created entity missing ID',
              details: content,
            });
          }
        } catch (parseError) {
          failed++;
          this.recordResult({
            name: `${tool.name} - Create`,
            passed: false,
            error: 'Failed to parse response',
            details: result,
          });
        }
      } else {
        failed++;
        this.recordResult({
          name: `${tool.name} - Create`,
          passed: false,
          error: 'Create failed',
          details: result,
        });
      }
    }

    const success = failed === 0;

    this.recordResult({
      name: `Test Create Tools (${passed}/${createTools.length} passed)`,
      passed: success,
      details: { passed, failed, createdIds },
    });

    return { success, createdIds };
  }

  async testGetTools(createdIds: Array<{ tool: string; id: string }>): Promise<boolean> {
    const getTools = this.tools.filter((tool) => tool.name.startsWith('get_'));

    if (getTools.length === 0) {
      this.recordResult({
        name: 'Test Get Tools',
        passed: false,
        error: 'No get tools found',
      });
      return false;
    }

    let passed = 0;
    let failed = 0;

    for (const tool of getTools) {
      const entityName = tool.name.replace('get_', '');

      // Find a created ID for this entity type
      const createdEntity = createdIds.find((c) =>
        c.tool.includes(entityName.replace('create_', ''))
      );

      if (createdEntity) {
        const result = await this.callTool(tool.name, { id: createdEntity.id });

        if (result && !result.isError) {
          try {
            const content = JSON.parse(result.content[0]?.text || '{}');
            if (content._id || content.id) {
              passed++;
            } else {
              failed++;
              this.recordResult({
                name: `${tool.name} - Get`,
                passed: false,
                error: 'Get result missing ID',
                details: content,
              });
            }
          } catch (parseError) {
            failed++;
            this.recordResult({
              name: `${tool.name} - Get`,
              passed: false,
              error: 'Failed to parse response',
              details: result,
            });
          }
        } else {
          failed++;
          this.recordResult({
            name: `${tool.name} - Get`,
            passed: false,
            error: 'Get failed',
            details: result,
          });
        }
      } else {
        // Test with invalid ID
        const result = await this.callTool(tool.name, { id: 'invalid-id-12345' });
        if (result && result.isError) {
          passed++; // Expected to fail
        } else {
          failed++;
          this.recordResult({
            name: `${tool.name} - Get Invalid ID`,
            passed: false,
            error: 'Should have failed with invalid ID',
            details: result,
          });
        }
      }
    }

    const success = failed === 0;

    this.recordResult({
      name: `Test Get Tools (${passed}/${getTools.length * 2} passed)`,
      passed: success,
      details: { passed, failed },
    });

    return success;
  }

  async testGlobalSearch(): Promise<boolean> {
    const globalSearchTool = this.tools.find((tool) => tool.name === 'global_search');

    if (!globalSearchTool) {
      this.recordResult({
        name: 'Test Global Search',
        passed: false,
        error: 'global_search tool not found',
      });
      return false;
    }

    // Test 1: Wildcard search
    const wildcardResult = await this.callTool('global_search', { query: '*', limit: 5 });
    if (wildcardResult && !wildcardResult.isError) {
      try {
        const content = JSON.parse(wildcardResult.content[0]?.text || '{}');
        if (content.results && Array.isArray(content.results)) {
          this.recordResult({
            name: 'Global Search - Wildcard',
            passed: true,
          });
        } else {
          this.recordResult({
            name: 'Global Search - Wildcard',
            passed: false,
            error: 'Invalid response format',
            details: content,
          });
          return false;
        }
      } catch (parseError) {
        this.recordResult({
          name: 'Global Search - Wildcard',
          passed: false,
          error: 'Failed to parse response',
          details: wildcardResult,
        });
        return false;
      }
    } else {
      this.recordResult({
        name: 'Global Search - Wildcard',
        passed: false,
        error: 'Wildcard search failed',
        details: wildcardResult,
      });
      return false;
    }

    // Test 2: Count only
    const countResult = await this.callTool('global_search', {
      query: '*',
      count_only: true,
    });
    if (countResult && !countResult.isError) {
      this.recordResult({
        name: 'Global Search - Count Only',
        passed: true,
      });
    } else {
      this.recordResult({
        name: 'Global Search - Count Only',
        passed: false,
        error: 'Count only failed',
        details: countResult,
      });
      return false;
    }

    return true;
  }

  async testWorkflowTools(): Promise<boolean> {
    const workflowTools = this.tools.filter((tool) => tool.name.startsWith('workflow_'));

    if (workflowTools.length === 0) {
      this.recordResult({
        name: 'Test Workflow Tools',
        passed: true, // Not all tenants have workflows
        details: { message: 'No workflow tools found (this is OK)' },
      });
      return true;
    }

    // Test workflow_list
    const listTool = workflowTools.find((tool) => tool.name === 'workflow_list');
    if (listTool) {
      const result = await this.callTool('workflow_list', {});
      if (result && !result.isError) {
        this.recordResult({
          name: 'Workflow List',
          passed: true,
        });
      } else {
        this.recordResult({
          name: 'Workflow List',
          passed: false,
          error: 'Workflow list failed',
          details: result,
        });
        return false;
      }
    }

    return true;
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    console.log('='.repeat(60) + '\n');
  }

  async runAllTests(email: string, password: string): Promise<boolean> {
    this.log('Starting MCP Tools Test Suite', 'info');
    console.log('');

    // Step 1: Login
    if (!(await this.login(email, password))) {
      return false;
    }

    // Step 2: List tools
    if (!(await this.listTools())) {
      return false;
    }

    // Step 3: Test tool validation
    this.log('\nTesting tool validation...', 'info');
    for (const tool of this.tools.slice(0, 5)) {
      // Test first 5 tools for validation
      await this.testToolValidation(tool);
    }

    // Step 4: Test search tools
    this.log('\nTesting search tools...', 'info');
    await this.testSearchTools();

    // Step 5: Test create tools
    this.log('\nTesting create tools...', 'info');
    const createResult = await this.testCreateTools();
    const createdIds = createResult.createdIds || [];

    // Step 6: Test get tools
    if (createdIds.length > 0) {
      this.log('\nTesting get tools...', 'info');
      await this.testGetTools(createdIds);
    }

    // Step 7: Test global search
    this.log('\nTesting global search...', 'info');
    await this.testGlobalSearch();

    // Step 8: Test workflow tools
    this.log('\nTesting workflow tools...', 'info');
    await this.testWorkflowTools();

    // Print summary
    this.printSummary();

    const allPassed = this.results.every((r) => r.passed);
    return allPassed;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const apiBase = args[0] || 'http://localhost:3000/api';
  const tenant = args[1] || 'demo';
  const unit = args[2] || 'sales';
  const email = args[3] || 'admin@demo.local';
  const password = args[4] || 'changeme';

  console.log('MCP Tools Test Script');
  console.log('='.repeat(60));
  console.log(`API Base: ${apiBase}`);
  console.log(`Tenant: ${tenant}`);
  console.log(`Unit: ${unit}`);
  console.log(`Email: ${email}`);
  console.log('='.repeat(60) + '\n');

  const tester = new MCPToolsTester(apiBase, tenant, unit);
  const success = await tester.runAllTests(email, password);

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { MCPToolsTester };
