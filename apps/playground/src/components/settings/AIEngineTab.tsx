import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAIStore, providerModels, type AIProvider } from '@/stores/ai-store';
import { playgroundSettingsApi } from '@/lib/api/playground-settings';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Save, Eye, EyeOff, Copy } from 'lucide-react';

const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'azure']),
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8000).optional(),
});

type AIConfigForm = z.infer<typeof aiConfigSchema>;

export default function AIEngineTab() {
  const { config, setConfig } = useAIStore();
  const { tenantId } = useAuthStore();
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(
    (config?.provider as AIProvider) || 'openai'
  );

  const defaultFormValues: AIConfigForm = config || {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
  };

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AIConfigForm>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: defaultFormValues,
  });

  const currentModel = watch('model');

  const tenantSettingsQuery = useQuery({
    queryKey: ['tenant-playground-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant context not available');
      }
      return playgroundSettingsApi.getTenantSettings(tenantId);
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (tenantSettingsQuery.data?.ai) {
      const apiValues: AIConfigForm = {
        provider: tenantSettingsQuery.data.ai.provider,
        apiKey: tenantSettingsQuery.data.ai.apiKey || '',
        model: tenantSettingsQuery.data.ai.model || 'gpt-4o-mini',
        temperature: tenantSettingsQuery.data.ai.temperature ?? 0.7,
        maxTokens: tenantSettingsQuery.data.ai.maxTokens ?? 2000,
      };
      reset(apiValues);
      setSelectedProvider(apiValues.provider);
      setConfig(apiValues);
    }
  }, [tenantSettingsQuery.data, reset, setConfig]);

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setValue('provider', provider);
    // Set default model for provider
    const defaultModel = providerModels[provider][0];
    setValue('model', defaultModel);
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: AIConfigForm) => {
      if (!tenantId) {
        throw new Error('Tenant context not available');
      }
      const response = await playgroundSettingsApi.updateTenantSettings(tenantId, { ai: data });
      return response;
    },
    onSuccess: (_, variables) => {
      setConfig(variables);
      toast({
        title: 'AI Engine configurato',
        description: `Configurazione salvata per ${variables.provider} (${variables.model})`,
      });
      tenantSettingsQuery.refetch();
    },
    onError: (error) => {
      console.error('Error saving config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
      toast({
        title: 'Errore di configurazione',
        description: errorMessage,
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Copia messaggio di errore"
            onClick={() => {
              navigator.clipboard.writeText(errorMessage).then(() => {
                toast({
                  title: 'Copiato',
                  description: "Messaggio d'errore copiato negli appunti",
                });
              });
            }}
          >
            <Copy className="h-4 w-4" />
          </ToastAction>
        ),
      });
    },
  });

  const onSubmit = async (data: AIConfigForm) => {
    if (!tenantId) {
      toast({
        title: 'Tenant non disponibile',
        description: 'Effettua il login oppure seleziona un tenant valido.',
        variant: 'destructive',
      });
      return;
    }
    updateSettingsMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Engine Configuration</CardTitle>
          <CardDescription>
            Configure the LLM provider and settings for AI agents. The agent runs client-side and
            uses MCP tools exposed by the API server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tenantId && (
            <p className="text-sm text-yellow-600">
              Effettua il login e seleziona un tenant per configurare l&apos;AI Engine.
            </p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={selectedProvider}
                onValueChange={(value) => handleProviderChange(value as AIProvider)}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select AI provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="azure">Azure OpenAI</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" {...register('provider')} />
              {errors.provider && <p className="text-sm text-red-500">{errors.provider.message}</p>}
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Enter your API key"
                  {...register('apiKey')}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.apiKey && <p className="text-sm text-red-500">{errors.apiKey.message}</p>}
              <p className="text-xs text-gray-500">
                Your API key is stored locally and never sent to our servers
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={currentModel} onValueChange={(value) => setValue('model', value)}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {providerModels[selectedProvider].map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" {...register('model')} />
              {errors.model && <p className="text-sm text-red-500">{errors.model.message}</p>}
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                placeholder="0.7"
                {...register('temperature', { valueAsNumber: true })}
              />
              {errors.temperature && (
                <p className="text-sm text-red-500">{errors.temperature.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Controls randomness (0 = deterministic, 2 = very creative)
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min="1"
                max="8000"
                placeholder="2000"
                {...register('maxTokens', { valueAsNumber: true })}
              />
              {errors.maxTokens && (
                <p className="text-sm text-red-500">{errors.maxTokens.message}</p>
              )}
              <p className="text-xs text-gray-500">Maximum number of tokens in the response</p>
            </div>

            {/* Save Button */}
            <Button
              type="submit"
              disabled={isSubmitting || updateSettingsMutation.isPending || !tenantId}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting || updateSettingsMutation.isPending
                ? 'Saving...'
                : 'Save Configuration'}
            </Button>
            {tenantSettingsQuery.isLoading && (
              <p className="text-xs text-gray-500">Caricamento configurazione in corso...</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Configuration Status */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Provider:</span>
                <span className="font-medium">{config.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Model:</span>
                <span className="font-medium">{config.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">API Key:</span>
                <span className="font-medium">
                  {config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'Not set'}
                </span>
              </div>
              {config.temperature !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Temperature:</span>
                  <span className="font-medium">{config.temperature}</span>
                </div>
              )}
              {config.maxTokens !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Tokens:</span>
                  <span className="font-medium">{config.maxTokens}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
