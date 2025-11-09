import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import IndexingTab from '@/components/settings/IndexingTab';
import AIEngineTab from '@/components/settings/AIEngineTab';
import MCPToolsTab from '@/components/settings/MCPToolsTab';
import APIMethodsTab from '@/components/settings/APIMethodsTab';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500">Configure your playground preferences</p>
      </div>

      <Tabs defaultValue="mcp" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mcp">MCP Tools</TabsTrigger>
          <TabsTrigger value="api">API Methods</TabsTrigger>
          <TabsTrigger value="ai">AI Engine</TabsTrigger>
          <TabsTrigger value="indexing">Indexing</TabsTrigger>
        </TabsList>

        <TabsContent value="mcp">
          <MCPToolsTab />
        </TabsContent>

        <TabsContent value="api">
          <APIMethodsTab />
        </TabsContent>

        <TabsContent value="ai">
          <AIEngineTab />
        </TabsContent>

        <TabsContent value="indexing">
          <IndexingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
