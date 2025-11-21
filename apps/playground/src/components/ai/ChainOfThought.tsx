import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  Brain,
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: string;
  error?: string;
}

export interface ChainOfThoughtProps {
  thinking?: string[];
  toolCalls?: ToolCall[];
  userMessage?: string;
  assistantResponse?: string;
  className?: string;
}

export default function ChainOfThought({
  thinking,
  toolCalls,
  userMessage,
  assistantResponse,
  className,
}: ChainOfThoughtProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const hasData = (thinking && thinking.length > 0) || (toolCalls && toolCalls.length > 0);

  if (!hasData) {
    return null;
  }

  const formatChainOfThought = (): string => {
    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push('CHAIN OF THOUGHT - EXECUTION LOG');
    lines.push('='.repeat(80));
    lines.push('');

    // User Message
    if (userMessage) {
      lines.push('USER MESSAGE:');
      lines.push('-'.repeat(80));
      lines.push(userMessage);
      lines.push('');
    }

    // Thinking Steps
    if (thinking && thinking.length > 0) {
      lines.push('THINKING STEPS:');
      lines.push('-'.repeat(80));
      thinking.forEach((thought, index) => {
        lines.push(`${index + 1}. ${thought}`);
      });
      lines.push('');
    }

    // Tool Calls
    if (toolCalls && toolCalls.length > 0) {
      lines.push('TOOL CALLS:');
      lines.push('-'.repeat(80));
      toolCalls.forEach((toolCall, index) => {
        lines.push(`\n[${index + 1}] Tool: ${toolCall.name}`);
        lines.push(`Status: ${toolCall.error ? 'ERROR' : toolCall.result ? 'SUCCESS' : 'PENDING'}`);

        // Arguments
        if (Object.keys(toolCall.args).length > 0) {
          lines.push('Arguments:');
          lines.push(JSON.stringify(toolCall.args, null, 2));
        }

        // Result
        if (toolCall.result) {
          lines.push('Result:');
          // Truncate very long results for readability
          const resultPreview =
            toolCall.result.length > 2000
              ? `${toolCall.result.substring(0, 2000)}...\n[Result truncated - full length: ${toolCall.result.length} characters]`
              : toolCall.result;
          lines.push(resultPreview);
        }

        // Error
        if (toolCall.error) {
          lines.push('ERROR:');
          lines.push(toolCall.error);
        }

        lines.push('-'.repeat(80));
      });
      lines.push('');
    }

    // Assistant Response
    if (assistantResponse) {
      lines.push('ASSISTANT RESPONSE:');
      lines.push('-'.repeat(80));
      lines.push(assistantResponse);
      lines.push('');
    }

    lines.push('='.repeat(80));
    lines.push(`Generated at: ${new Date().toISOString()}`);
    lines.push('='.repeat(80));

    return lines.join('\n');
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding/collapsing when clicking copy button
    try {
      const formattedText = formatChainOfThought();
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Chain of Thought copied to clipboard',
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
        duration: 2000,
      });
    }
  };

  return (
    <Card className={cn('mt-2 border-blue-200 bg-blue-50/50', className)}>
      <CardHeader className="cursor-pointer pb-2" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-blue-900">Chain of Thought</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {thinking?.length || 0} thinking
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {toolCalls?.length || 0} tools
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleCopy}
              title="Copy Chain of Thought to clipboard"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-blue-600" />
              )}
            </Button>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-blue-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-blue-600" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Thinking Steps */}
          {thinking && thinking.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <Brain className="h-3 w-3" />
                <span>Thinking Steps</span>
              </div>
              <div className="space-y-2 pl-5">
                {thinking.map((thought, index) => (
                  <div
                    key={index}
                    className="rounded-md bg-white p-2 text-xs text-gray-600 shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 font-mono text-xs text-gray-400">{index + 1}.</span>
                      <span className="flex-1">{thought}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool Calls */}
          {toolCalls && toolCalls.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <Wrench className="h-3 w-3" />
                <span>Tool Calls</span>
              </div>
              <div className="space-y-3 pl-5">
                {toolCalls.map((toolCall, index) => {
                  const hasError = !!toolCall.error;
                  const hasResult = !!toolCall.result && !hasError;
                  const isPending = !hasResult && !hasError;

                  return (
                    <Card
                      key={index}
                      className={cn(
                        'border-l-4 shadow-sm',
                        hasError
                          ? 'border-l-red-500 bg-red-50/50'
                          : hasResult
                            ? 'border-l-green-500 bg-green-50/50'
                            : 'border-l-yellow-500 bg-yellow-50/50'
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          {/* Tool Name and Status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <code className="rounded bg-gray-200 px-2 py-0.5 text-xs font-mono text-gray-800">
                                {toolCall.name}
                              </code>
                              {isPending && (
                                <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />
                              )}
                              {hasError && <XCircle className="h-3 w-3 text-red-600" />}
                              {hasResult && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                            </div>
                            <Badge
                              variant={
                                hasError ? 'destructive' : hasResult ? 'success' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {hasError ? 'Error' : hasResult ? 'Success' : 'Pending'}
                            </Badge>
                          </div>

                          {/* Tool Arguments */}
                          {Object.keys(toolCall.args).length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-gray-600">Arguments:</div>
                              <pre className="max-h-32 overflow-auto rounded bg-gray-100 p-2 text-xs">
                                {JSON.stringify(toolCall.args, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Tool Result */}
                          {toolCall.result && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-gray-600">Result:</div>
                              <pre className="max-h-48 overflow-auto rounded bg-gray-100 p-2 text-xs">
                                {toolCall.result.length > 500
                                  ? `${toolCall.result.substring(0, 500)}...`
                                  : toolCall.result}
                              </pre>
                            </div>
                          )}

                          {/* Tool Error */}
                          {toolCall.error && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-red-600">Error:</div>
                              <div className="rounded bg-red-100 p-2 text-xs text-red-800">
                                {toolCall.error}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
