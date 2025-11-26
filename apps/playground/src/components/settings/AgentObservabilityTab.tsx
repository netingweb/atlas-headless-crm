import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { agentLogger } from '@/lib/ai/agent-logger';
import {
  Activity,
  BarChart3,
  Download,
  ExternalLink,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AgentObservabilityTab() {
  const { toast } = useToast();
  const [summary, setSummary] = useState(agentLogger.getSummary());
  const [toolStats, setToolStats] = useState(agentLogger.getToolUsageStats());
  const [logs, setLogs] = useState(agentLogger.getLogs());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const refreshData = () => {
    setSummary(agentLogger.getSummary());
    setToolStats(agentLogger.getToolUsageStats());
    setLogs(agentLogger.getLogs());
  };

  useEffect(() => {
    // Refresh every 2 seconds for real-time updates
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleExportLogs = () => {
    const json = agentLogger.exportLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Logs exported',
      description: 'Agent logs have been exported to JSON file',
    });
  };

  const handleClearLogs = () => {
    agentLogger.clearLogs();
    refreshData();
    toast({
      title: 'Logs cleared',
      description: 'All agent logs have been cleared',
    });
  };

  const toggleLogExpansion = (messageId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedLogs(newExpanded);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ogni esecuzione restituisce eventi SSE dal servizio agent-service e, se configurato,
        condivide il link LangSmith per approfondire tracing e metriche.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalExecutions}</div>
            <p className="text-xs text-muted-foreground">
              Avg duration: {formatDuration(summary.avgDurationMs)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tool Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalToolCalls}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalExecutions > 0
                ? `${(summary.totalToolCalls / summary.totalExecutions).toFixed(1)} per execution`
                : 'No executions'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Thinking Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalThinkingSteps}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalExecutions > 0
                ? `${(summary.totalThinkingSteps / summary.totalExecutions).toFixed(1)} per execution`
                : 'No executions'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalExecutions > 0
                ? `${((summary.totalErrors / summary.totalExecutions) * 100).toFixed(1)}% error rate`
                : 'No executions'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              SSE Stream
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Messages</span>
              <span className="font-semibold text-gray-900">{summary.sseEvents.messages}</span>
            </div>
            <div className="flex justify-between">
              <span>Plan steps</span>
              <span className="font-semibold text-gray-900">{summary.sseEvents.planSteps}</span>
            </div>
            <div className="flex justify-between">
              <span>Subagents</span>
              <span className="font-semibold text-gray-900">{summary.sseEvents.subagentCalls}</span>
            </div>
            <div className="flex justify-between">
              <span>Tool calls</span>
              <span className="font-semibold text-gray-900">{summary.sseEvents.toolCalls}</span>
            </div>
            <div className="flex justify-between">
              <span>Tool results</span>
              <span className="font-semibold text-gray-900">{summary.sseEvents.toolResults}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tool Usage Statistics */}
      {Object.keys(toolStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tool Usage Statistics
            </CardTitle>
            <CardDescription>
              Statistics about tool usage across all agent executions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool Name</TableHead>
                  <TableHead>Total Calls</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Error Rate</TableHead>
                  <TableHead>Avg Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(toolStats)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([toolName, stats]) => (
                    <TableRow key={toolName}>
                      <TableCell>
                        <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono">
                          {toolName}
                        </code>
                      </TableCell>
                      <TableCell>{stats.count}</TableCell>
                      <TableCell>
                        {stats.errors > 0 ? (
                          <Badge variant="destructive">{stats.errors}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stats.count > 0
                          ? `${((stats.errors / stats.count) * 100).toFixed(1)}%`
                          : '0%'}
                      </TableCell>
                      <TableCell>{formatDuration(stats.avgDurationMs)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Execution Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div>
                <CardTitle>Execution Logs</CardTitle>
                <CardDescription>
                  Dettagli sulle esecuzioni, inclusi conteggi SSE, subagent e link LangSmith
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportLogs}
                disabled={logs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                disabled={logs.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No execution logs yet</p>
              <p className="text-sm">Start chatting with the AI agent to see logs here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs
                .slice()
                .reverse()
                .map((log) => (
                  <Card key={log.messageId} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm">
                            {new Date(log.timestamp).toLocaleString()}
                          </CardTitle>
                          {log.error && <Badge variant="destructive">Error</Badge>}
                          <Badge variant="secondary">{formatDuration(log.durationMs)}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLogExpansion(log.messageId)}
                        >
                          {expandedLogs.has(log.messageId) ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Show Details
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700">User Message:</p>
                          <p className="text-sm text-gray-600">{log.userMessage}</p>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                          <span>
                            SSE · msg {log.sseEvents?.messages ?? 0} · plan{' '}
                            {log.sseEvents?.planSteps ?? 0} · subagents{' '}
                            {log.sseEvents?.subagentCalls ?? 0}
                          </span>
                          <span>
                            tool calls {log.sseEvents?.toolCalls ?? 0} / results{' '}
                            {log.sseEvents?.toolResults ?? 0}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>
                            {log.toolCalls.length} tool call{log.toolCalls.length !== 1 ? 's' : ''}
                          </span>
                          <span>
                            {log.thinking.length} thinking step
                            {log.thinking.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {expandedLogs.has(log.messageId) && (
                          <div className="mt-4 space-y-4 border-t pt-4">
                            {log.thinking.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">Thinking Steps:</p>
                                <div className="space-y-1 pl-4">
                                  {log.thinking.map((thought, idx) => (
                                    <p key={idx} className="text-xs text-gray-600">
                                      {idx + 1}. {thought.content}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            {log.toolCalls.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">Tool Calls:</p>
                                <div className="space-y-2 pl-4">
                                  {log.toolCalls.map((toolCall, idx) => (
                                    <div
                                      key={idx}
                                      className="text-xs border-l-2 border-l-gray-300 pl-2"
                                    >
                                      <p className="font-mono font-medium">{toolCall.toolName}</p>
                                      {toolCall.durationMs && (
                                        <p className="text-muted-foreground">
                                          Duration: {formatDuration(toolCall.durationMs)}
                                        </p>
                                      )}
                                      {toolCall.error && (
                                        <p className="text-red-600">Error: {toolCall.error}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {log.subagentCalls?.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">Subagent calls:</p>
                                <div className="space-y-2 pl-4">
                                  {log.subagentCalls.map((subagent, idx) => (
                                    <div key={`${subagent.agent}-${subagent.timestamp}-${idx}`}>
                                      <p className="text-xs font-mono text-gray-700">
                                        {subagent.agent}
                                      </p>
                                      {subagent.input && (
                                        <pre className="text-[11px] bg-gray-50 rounded p-2 overflow-auto">
                                          {JSON.stringify(subagent.input, null, 2)}
                                        </pre>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {log.error && (
                              <div className="bg-red-50 border border-red-200 rounded p-2">
                                <p className="text-sm font-medium text-red-800">Error:</p>
                                <p className="text-sm text-red-600">{log.error}</p>
                              </div>
                            )}
                            {log.assistantResponse && (
                              <div>
                                <p className="text-sm font-medium mb-2">Assistant Response:</p>
                                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                  {log.assistantResponse.substring(0, 500)}
                                  {log.assistantResponse.length > 500 ? '...' : ''}
                                </p>
                              </div>
                            )}
                            {log.tracingUrl && (
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">LangSmith Trace:</p>
                                <Button variant="link" size="sm" asChild>
                                  <a href={log.tracingUrl} target="_blank" rel="noreferrer">
                                    Apri run <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
