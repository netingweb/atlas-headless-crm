import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import IndexingTab from '@/components/settings/IndexingTab';
import AIEngineTab from '@/components/settings/AIEngineTab';
import MCPToolsTab from '@/components/settings/MCPToolsTab';

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
          <Card>
            <CardHeader>
              <CardTitle>API Methods Configuration</CardTitle>
              <CardDescription>Enable or disable API methods</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                API methods configuration will be implemented here
              </p>
            </CardContent>
          </Card>
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
